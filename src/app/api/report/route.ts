import { ReportReason } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reportSchema = z.object({
  emailId: z.string().uuid(),
  reason: z.nativeEnum(ReportReason),
  notes: z.string().max(400).optional()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.report.upsert({
    where: {
      reporterId_emailId: {
        reporterId: session.user.id,
        emailId: parsed.data.emailId
      }
    },
    update: {
      reason: parsed.data.reason,
      notes: parsed.data.notes?.trim() || null
    },
    create: {
      reporterId: session.user.id,
      emailId: parsed.data.emailId,
      reason: parsed.data.reason,
      notes: parsed.data.notes?.trim() || null
    }
  });

  return NextResponse.json({ ok: true });
}
