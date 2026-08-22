import { NextResponse } from "next/server";
import { z } from "zod";
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

const patchSchema = z.object({
  /** True archives the student, false restores them. */
  archived: z.boolean(),
});

/**
 * Archive or restore a student on this teacher's roster.
 *
 * Archiving is deliberately a stamped column rather than a delete: a teacher
 * who stops seeing a student still needs their lesson history, invoices and
 * notes, and may take them back on later. DELETE above is the destructive
 * path and stays separate.
 */
export async function PATCH(req: Request, ctx: Props) {
  const session = await auth();
  if (!session?.user?.id || !isTeacherCabinetRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { entryId } = await ctx.params;

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No teacher profile" }, { status: 404 });
  }

  // Scoped by teacherId as well as id, so an entry on someone else's roster
  // cannot be reached by guessing an id.
  const updated = await prisma.teacherRosterEntry.updateMany({
    where: { id: entryId, teacherId: profile.id },
    data: { archivedAt: parsed.data.archived ? new Date() : null },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, archived: parsed.data.archived });
}
