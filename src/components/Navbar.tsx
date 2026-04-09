"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, RabbitIcon } from "lucide-react";

import { SignInButton } from "@/components/AuthButtons";
import { CreditBadge } from "@/components/CreditBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavbarProps = {
  user: {
    displayName: string;
    email: string | null;
    image: string | null;
  } | null;
  creditBalance: number;
  isAdmin: boolean;
};

const BASE_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/submit", label: "Submit" }
] as const;

function getInitials(name: string) {
  const segments = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (segments.length === 0) {
    return "HR";
  }

  return segments.map((segment) => segment[0]?.toUpperCase() ?? "").join("");
}

export function Navbar({ user, creditBalance, isAdmin }: NavbarProps) {
  const pathname = usePathname();
  const hideLandingSignIn = !user && pathname === "/";

  return (
    <header className="sticky top-0 z-50 hidden border-b bg-background/95 backdrop-blur md:block">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link className="flex items-center gap-2" href="/">
          <RabbitIcon className="size-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">Hare</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-5">
            <nav className="flex items-center gap-4">
              {BASE_LINKS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    className={cn(
                      "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                      active && "text-foreground"
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <CreditBadge credits={creditBalance} unlimited={isAdmin} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 gap-2 px-2" variant="ghost">
                  <Avatar className="size-7">
                    <AvatarImage alt={user.displayName} src={user.image ?? undefined} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
                  {user.email ? (
                    <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/submit">Submit</Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Admin</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    signOut({ callbackUrl: "/" });
                  }}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : hideLandingSignIn ? null : (
          <SignInButton className="h-9 px-4" />
        )}
      </div>
    </header>
  );
}
