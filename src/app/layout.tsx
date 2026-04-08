import Link from "next/link";
import { getServerSession } from "next-auth";
import { ReactNode } from "react";

import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import { authOptions } from "@/lib/auth";

import "./globals.css";

export const metadata = {
  title: "Hare",
  description: "Give recruiter contacts, get recruiter contacts."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="top-nav">
            <Link className="brand" href="/">
              Hare
            </Link>
            <nav className="nav-links">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/submit">Submit</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/opt-out">Recruiter Opt-Out</Link>
              {session?.user ? (
                <SignOutButton className="nav-link-btn" />
              ) : (
                <SignInButton className="nav-link-btn" />
              )}
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
