import { CoinsIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CreditBadgeProps = {
  credits: number;
  unlimited?: boolean;
  className?: string;
};

function creditLabel(credits: number) {
  return credits === 1 ? "1 credit" : `${credits} credits`;
}

export function CreditBadge({ credits, unlimited = false, className }: CreditBadgeProps) {
  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 border-amber-200 bg-amber-50 text-amber-700",
        className
      )}
      variant="secondary"
    >
      <CoinsIcon className="size-3.5" />
      {unlimited ? "Unlimited credits" : creditLabel(credits)}
    </Badge>
  );
}
