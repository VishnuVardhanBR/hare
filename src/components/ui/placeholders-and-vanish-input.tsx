"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PlaceholdersAndVanishInputProps = {
  placeholders: string[];
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: () => boolean | void;
  className?: string;
  disabled?: boolean;
  enableVanishOnSubmit?: boolean;
};

type PixelPoint = {
  x: number;
  y: number;
  r: number;
  color: string;
};

export function PlaceholdersAndVanishInput({
  placeholders,
  value,
  onValueChange,
  onSubmit,
  className,
  disabled = false,
  enableVanishOnSubmit = true
}: PlaceholdersAndVanishInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [animating, setAnimating] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointsRef = useRef<PixelPoint[]>([]);

  const startPlaceholderAnimation = useCallback(() => {
    if (placeholders.length < 2 || intervalRef.current) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  }, [placeholders.length]);

  useEffect(() => {
    startPlaceholderAnimation();

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      startPlaceholderAnimation();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [startPlaceholderAnimation]);

  const drawTextToPoints = useCallback(() => {
    if (!inputRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const size = 800;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    const computedStyles = getComputedStyle(inputRef.current);
    const fontSize = Number.parseFloat(computedStyles.getPropertyValue("font-size")) || 16;
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(value, 16, 40);

    const imageData = ctx.getImageData(0, 0, size, size);
    const pixelData = imageData.data;
    const nextPoints: PixelPoint[] = [];

    for (let row = 0; row < size; row += 1) {
      const rowStart = 4 * row * size;
      for (let col = 0; col < size; col += 1) {
        const index = rowStart + 4 * col;
        if (pixelData[index] && pixelData[index + 1] && pixelData[index + 2]) {
          nextPoints.push({
            x: col,
            y: row,
            r: 1,
            color: `rgba(${pixelData[index]}, ${pixelData[index + 1]}, ${pixelData[index + 2]}, ${pixelData[index + 3]})`
          });
        }
      }
    }

    pointsRef.current = nextPoints;
  }, [value]);

  useEffect(() => {
    if (!animating) {
      drawTextToPoints();
    }
  }, [animating, drawTextToPoints]);

  const animateVanish = useCallback((startX: number) => {
    const step = (threshold: number) => {
      requestAnimationFrame(() => {
        const nextPoints: PixelPoint[] = [];
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) {
          setAnimating(false);
          return;
        }

        ctx.clearRect(threshold, 0, 800, 800);

        for (const point of pointsRef.current) {
          if (point.x < threshold) {
            nextPoints.push(point);
            continue;
          }

          if (point.r <= 0) {
            continue;
          }

          point.x += Math.random() > 0.5 ? 1 : -1;
          point.y += Math.random() > 0.5 ? 1 : -1;
          point.r -= 0.05 * Math.random();
          nextPoints.push(point);

          ctx.beginPath();
          ctx.rect(point.x, point.y, point.r, point.r);
          ctx.fillStyle = point.color;
          ctx.strokeStyle = point.color;
          ctx.stroke();
        }

        pointsRef.current = nextPoints;
        if (pointsRef.current.length > 0) {
          step(threshold - 8);
          return;
        }

        onValueChange("");
        setAnimating(false);
      });
    };

    step(startX);
  }, [onValueChange]);

  const handleSubmit = useCallback(() => {
    if (!value || disabled) {
      return;
    }

    const shouldAnimate = onSubmit?.();
    if (shouldAnimate === false) {
      return;
    }

    if (!enableVanishOnSubmit) {
      return;
    }

    setAnimating(true);
    drawTextToPoints();

    const maxX = pointsRef.current.reduce((prev, current) => Math.max(prev, current.x), 0);
    animateVanish(maxX);
  }, [
    animateVanish,
    disabled,
    drawTextToPoints,
    enableVanishOnSubmit,
    onSubmit,
    value
  ]);

  return (
    <form
      className={cn(
        "relative h-11 w-full overflow-hidden rounded-md border bg-background shadow-sm transition-colors",
        value ? "bg-muted/20" : "bg-background",
        className
      )}
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <canvas
        className={cn(
          "pointer-events-none absolute left-2 top-[20%] origin-top-left scale-50 pr-20",
          "filter invert dark:invert-0",
          !animating ? "opacity-0" : "opacity-100"
        )}
        ref={canvasRef}
      />
      <input
        className={cn(
          "relative z-10 h-full w-full border-none bg-transparent pl-4 pr-12 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-0",
          animating && "text-transparent"
        )}
        disabled={disabled || animating}
        onChange={(event) => onValueChange(event.target.value)}
        ref={inputRef}
        type="text"
        value={value}
      />

      <button
        className={cn(
          "absolute right-1.5 top-1/2 z-20 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors",
          "bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        )}
        disabled={!value || disabled}
        type="submit"
      >
        <motion.svg
          className="size-4"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={{ strokeDashoffset: value ? 0 : "50%" }}
            d="M5 12l14 0"
            initial={{ strokeDasharray: "50%", strokeDashoffset: "50%" }}
            transition={{ duration: 0.25, ease: "linear" }}
          />
          <path d="M13 18l6 -6" />
          <path d="M13 6l6 6" />
        </motion.svg>
      </button>

      <div className="pointer-events-none absolute inset-0 flex items-center rounded-md">
        <AnimatePresence mode="wait">
          {!value ? (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="truncate pl-4 pr-12 text-sm text-muted-foreground"
              exit={{ opacity: 0, y: -15 }}
              initial={{ opacity: 0, y: 5 }}
              key={`placeholder-${currentPlaceholder}`}
              transition={{ duration: 0.2, ease: "linear" }}
            >
              {placeholders[currentPlaceholder] ?? ""}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
}
