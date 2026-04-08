import { UserStatus } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      creditBalance: number;
      displayName: string;
      status: UserStatus;
    };
  }
}
