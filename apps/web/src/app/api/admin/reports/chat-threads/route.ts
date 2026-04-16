import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const threads = await prisma.chatThread.findMany({
    where: {
      OR: [
        { studentReportedAt: { not: null } },
        { teacherReportedAt: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ items: threads });
}
