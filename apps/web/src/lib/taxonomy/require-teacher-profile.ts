import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * The teacher-taxonomy guard, declared once.
 *
 * Four teacher route files each carried their own byte-identical copy. Like the
 * org membership query, this is an authorization check, and an authorization
 * check with four copies is three chances to fix a bug in the wrong place.
 */
export async function requireTeacherProfile(): Promise<
  { ok: true; teacherId: string } | { ok: false; res: NextResponse }
> {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")
  ) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Teacher profile not found" }, { status: 404 }),
    };
  }
  return { ok: true, teacherId: profile.id };
}
