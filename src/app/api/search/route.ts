import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { normalizeCompanyName } from "@/lib/company";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ companies: [] });
  }

  const normalized = normalizeCompanyName(query);
  const aliasPattern = `%${normalized}%`;

  const [byName, byAliasRaw] = await Promise.all([
    prisma.company.findMany({
      where: {
        normalizedName: { contains: normalized }
      },
      select: {
        id: true,
        name: true,
        domain: true,
        logoUrl: true,
        _count: {
          select: {
            recruiterEmails: true
          }
        }
      },
      orderBy: {
        recruiterEmails: {
          _count: "desc"
        }
      },
      take: 12
    }),
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Company"
      WHERE lower(aliases::text) ILIKE ${aliasPattern}
      LIMIT 12
    `
  ]);

  const nameIds = new Set(byName.map((c) => c.id));
  const aliasOnlyIds = byAliasRaw.map((a) => a.id).filter((id) => !nameIds.has(id));

  let aliasCompanies: typeof byName = [];
  if (aliasOnlyIds.length > 0) {
    aliasCompanies = await prisma.company.findMany({
      where: { id: { in: aliasOnlyIds } },
      select: {
        id: true,
        name: true,
        domain: true,
        logoUrl: true,
        _count: {
          select: {
            recruiterEmails: true
          }
        }
      },
      orderBy: {
        recruiterEmails: {
          _count: "desc"
        }
      }
    });
  }

  const companies = [...byName, ...aliasCompanies].slice(0, 12);

  return NextResponse.json({
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      domain: company.domain,
      logoUrl: company.logoUrl,
      contactCount: company._count.recruiterEmails
    }))
  });
}
