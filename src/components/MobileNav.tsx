"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { MenuIcon, RabbitIcon } from "lucide-react";

import { SignInButton } from "@/components/AuthButtons";
import { CreditBadge } from "@/components/CreditBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type MobileNavProps = {
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

export function MobileNav({ user, creditBalance, isAdmin }: MobileNavProps) {
  const pathname = usePathname();
  const hideLandingSignIn = !user && pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto grid h-16 w-full max-w-4xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4">
        {user ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost">
                <MenuIcon className="size-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80 p-0" side="left" showCloseButton={false}>
              <SheetHeader className="border-b px-5 py-4 text-left">
                <SheetTitle>{user.displayName}</SheetTitle>
                <SheetDescription>{user.email ?? "Student account"}</SheetDescription>
              </SheetHeader>
              <nav className="grid gap-1 p-4">
                {BASE_LINKS.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        className={cn(
                          "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                          active && "bg-muted text-foreground"
                        )}
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
                {isAdmin ? (
                  <SheetClose asChild>
                    <Link
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                        pathname === "/admin" && "bg-muted text-foreground"
                      )}
                      href="/admin"
                    >
                      Admin
                    </Link>
                  </SheetClose>
                ) : null}
              </nav>
              <SheetFooter className="mt-auto border-t px-4 py-4">
                <Button
                  className="w-full"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  variant="outline"
                >
                  Sign Out
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ) : (
          <div />
        )}

        <div className="flex justify-center">
          <Link className="flex items-center gap-2" href="/">
            <RabbitIcon className="size-5 text-primary" />
            <span className="text-base font-semibold tracking-tight">Hare</span>
          </Link>
        </div>

        <div className="justify-self-end">
          {user ? (
            <CreditBadge className="text-xs" credits={creditBalance} unlimited={isAdmin} />
          ) : hideLandingSignIn ? null : (
            <SignInButton className="h-8 px-3 text-xs" />
          )}
        </div>
      </div>
    </header>
  );
}
