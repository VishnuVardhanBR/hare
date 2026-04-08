import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/session";

const schema = z.object({
  emailId: z.string().uuid()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = schema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.report.deleteMany({ where: { emailId: parsed.data.emailId } });
    await tx.unlock.deleteMany({ where: { emailId: parsed.data.emailId } });
    await tx.recruiterEmail.delete({ where: { id: parsed.data.emailId } });
  });

  return NextResponse.json({ ok: true });
}
