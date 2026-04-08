import { ReportStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/session";

const schema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["resolve", "dismiss"])
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

  const status =
    parsed.data.action === "resolve" ? ReportStatus.RESOLVED : ReportStatus.DISMISSED;

  await prisma.report.update({
    where: { id: parsed.data.reportId },
    data: { status }
  });

  return NextResponse.json({ ok: true });
}
