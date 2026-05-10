import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";

type Props = { params: Promise<{ entryId: string }> };

export async function DELETE(_req: Request, ctx: Props) {
  const session = await auth();
  if (!session?.user?.id || !isTeacherCabinetRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = await ctx.params;

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No teacher profile" }, { status: 404 });
  }

  const deleted = await prisma.teacherRosterEntry.deleteMany({
    where: { id: entryId, teacherId: profile.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
