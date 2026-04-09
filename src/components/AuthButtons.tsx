"use client";

import { signIn, signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignInButton({ className }: { className?: string }) {
  return (
    <Button
      className={cn(className)}
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      type="button"
    >
      Sign in with Google (.edu)
    </Button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <Button
      className={cn(className)}
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
      variant="ghost"
    >
      Sign out
    </Button>
  );
}
