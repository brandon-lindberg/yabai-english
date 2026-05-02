import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      nameJa: true,
      nameEn: true,
      timezone: true,
      billingTarget: true,
      createdAt: true,
      schools: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          nameJa: true,
          nameEn: true,
          _count: {
            select: { memberships: { where: { status: "ACTIVE" } } },
          },
        },
      },
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          orgRole: true,
          schoolId: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ organizations });
}
