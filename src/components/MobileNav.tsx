"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { MenuIcon, RabbitIcon, SearchIcon } from "lucide-react";

import {
  NavCreditPill,
  NavGhostButton,
  NavPrimaryPill,
  NavTextLink
} from "@/components/nav/NavPrimitives";
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

type MobileNavProps = {
  user: {
    displayName: string;
    email: string | null;
    image: string | null;
  } | null;
  creditBalance: number;
  isAdmin: boolean;
};

export function MobileNav({ user, creditBalance, isAdmin }: MobileNavProps) {
  const pathname = usePathname();
  const hideLandingSignIn = !user && pathname === "/";
  const searchActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const submitActive = pathname === "/submit" || pathname.startsWith("/submit/");
  const adminActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto grid h-16 w-full max-w-4xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4">
        {user ? (
          <Sheet>
            <SheetTrigger asChild>
              <NavGhostButton className="size-9 justify-center px-0" type="button">
                <MenuIcon className="size-5" />
                <span className="sr-only">Open navigation menu</span>
              </NavGhostButton>
            </SheetTrigger>
            <SheetContent className="w-80 p-0" side="left" showCloseButton={false}>
              <SheetHeader className="border-b px-5 py-4 text-left">
                <SheetTitle>{user.displayName}</SheetTitle>
                <SheetDescription>{user.email ?? "Student account"}</SheetDescription>
              </SheetHeader>

              <nav className="grid gap-2 p-4">
                <SheetClose asChild>
                  <NavPrimaryPill asChild active={searchActive} className="h-10 w-full justify-start px-3">
                    <Link href="/dashboard">
                      <SearchIcon className="size-4" />
                      Search
                    </Link>
                  </NavPrimaryPill>
                </SheetClose>

                <SheetClose asChild>
                  <NavTextLink
                    asChild
                    active={submitActive}
                    className="h-10 w-full justify-start rounded-xl border border-transparent px-3 hover:bg-white/70"
                  >
                    <Link href="/submit">Submit</Link>
                  </NavTextLink>
                </SheetClose>

                {isAdmin ? (
                  <SheetClose asChild>
                    <NavTextLink
                      asChild
                      active={adminActive}
                      className="h-10 w-full justify-start rounded-xl border border-transparent px-3 hover:bg-white/70"
                    >
                      <Link href="/admin">Admin</Link>
                    </NavTextLink>
                  </SheetClose>
                ) : null}
              </nav>

              <SheetFooter className="mt-auto border-t px-4 py-4">
                <NavGhostButton
                  className="h-10 w-full justify-center"
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign Out
                </NavGhostButton>
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
            <NavCreditPill className="h-8 px-2.5 text-xs" credits={creditBalance} unlimited={isAdmin} />
          ) : hideLandingSignIn ? null : (
            <NavPrimaryPill
              className="h-8 px-3 text-xs"
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              Sign in
            </NavPrimaryPill>
          )}
        </div>
      </div>
    </header>
  );
}
