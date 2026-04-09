"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, RabbitIcon, SearchIcon } from "lucide-react";

import {
  NavCreditPill,
  NavGhostButton,
  NavPrimaryPill,
  NavTextLink
} from "@/components/nav/NavPrimitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type NavbarProps = {
  user: {
    displayName: string;
    email: string | null;
    image: string | null;
  } | null;
  creditBalance: number;
  isAdmin: boolean;
};

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
  const searchActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const submitActive = pathname === "/submit" || pathname.startsWith("/submit/");

  return (
    <header className="sticky top-0 z-50 hidden border-b bg-background/95 backdrop-blur md:block">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link className="flex items-center gap-2" href="/">
          <RabbitIcon className="size-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">Hare</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3">
              <NavPrimaryPill asChild active={searchActive}>
                <Link href="/dashboard">
                  <SearchIcon className="size-3.5" />
                  Search
                </Link>
              </NavPrimaryPill>

              <NavTextLink asChild active={submitActive}>
                <Link href="/submit">Submit</Link>
              </NavTextLink>
            </nav>

            <NavCreditPill credits={creditBalance} unlimited={isAdmin} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <NavGhostButton className="px-2" type="button">
                  <Avatar className="size-7">
                    <AvatarImage alt={user.displayName} src={user.image ?? undefined} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                </NavGhostButton>
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
                  <Link href="/dashboard">Search</Link>
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
          <NavPrimaryPill
            className="h-9 px-4"
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Sign in with Google (.edu)
          </NavPrimaryPill>
        )}
      </div>
    </header>
  );
}
