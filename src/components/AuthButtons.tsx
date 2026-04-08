"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton({ className }: { className?: string }) {
  return (
    <button
      className={className ?? "primary-btn"}
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      type="button"
    >
      Sign in with .edu email
    </button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      className={className ?? "ghost-btn"}
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
    >
      Sign out
    </button>
  );
}
