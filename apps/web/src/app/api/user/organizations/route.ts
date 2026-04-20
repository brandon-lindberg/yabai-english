import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.organizationMembership.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
    },
    include: {
      organization: {
        select: {
          id: true,
          slug: true,
          name: true,
          nameJa: true,
          nameEn: true,
          logoUrl: true,
        },
      },
      school: {
        select: {
          id: true,
          slug: true,
          name: true,
          nameJa: true,
          nameEn: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by organization for the org switcher
  const orgsMap = new Map<
    string,
    {
      organization: (typeof memberships)[0]["organization"];
      memberships: typeof memberships;
    }
  >();

  for (const m of memberships) {
    const orgId = m.organization.id;
    if (!orgsMap.has(orgId)) {
      orgsMap.set(orgId, { organization: m.organization, memberships: [] });
    }
    orgsMap.get(orgId)!.memberships.push(m);
  }

  return NextResponse.json({
    organizations: Array.from(orgsMap.values()),
  });
}
