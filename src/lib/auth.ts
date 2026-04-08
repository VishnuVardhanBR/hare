import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { UserStatus } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";
import { bootstrapUserProfile } from "@/lib/user";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  // Keep the app bootable in development while env vars are missing.
  console.warn("Google OAuth environment variables are missing.");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database"
  },
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID ?? "",
      clientSecret: GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase().trim() ?? "";
      return email.endsWith(".edu");
    },
    async session({ session, user }) {
      if (!session.user) {
        return session;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          creditBalance: true,
          displayName: true,
          status: true
        }
      });

      if (!dbUser) {
        return session;
      }

      session.user.id = dbUser.id;
      session.user.creditBalance = dbUser.creditBalance;
      session.user.displayName = dbUser.displayName;
      session.user.status = dbUser.status as UserStatus;

      return session;
    }
  },
  events: {
    async createUser({ user }) {
      if (!user.email) {
        return;
      }

      await bootstrapUserProfile(user.id, user.email);
    }
  },
  pages: {
    signIn: "/"
  }
};
