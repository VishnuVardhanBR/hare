import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/session";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Hare",
  description: "Give recruiter contacts, get recruiter contacts.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://hare.vishnuvardhanbr.com"),
  openGraph: {
    title: "Hare",
    description: "Give recruiter contacts, get recruiter contacts.",
    url: "/",
    siteName: "Hare",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Hare logo and tagline"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Hare",
    description: "Give recruiter contacts, get recruiter contacts.",
    images: ["/opengraph-image"]
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  let user: {
    displayName: string;
    email: string | null;
    image: string | null;
  } | null = null;
  let creditBalance = 0;
  let isAdmin = false;

  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        displayName: true,
        creditBalance: true
      }
    });

    user = {
      displayName: dbUser?.displayName ?? session.user.name ?? "Student",
      email: session.user.email ?? null,
      image: session.user.image ?? null
    };
    creditBalance = dbUser?.creditBalance ?? 0;
    isAdmin = isAdminEmail(session.user.email);
  }

  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Navbar creditBalance={creditBalance} isAdmin={isAdmin} user={user} />
          <MobileNav creditBalance={creditBalance} isAdmin={isAdmin} user={user} />

          <main className="flex-1">
            <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">{children}</div>
          </main>

          <Footer />
        </div>

        <Toaster closeButton position="top-right" richColors />
      </body>
    </html>
  );
}
