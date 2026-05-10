import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { getStudentRosterTeachers } from "@/lib/student-roster-teachers";

/** JSON for student dashboard “My teachers” (same data as the page). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teachers = await getStudentRosterTeachers(prisma, session.user.id);

  return NextResponse.json({
    teachers: teachers.map((t) => ({
      teacherProfileId: t.teacherProfileId,
      displayName: t.displayName,
    })),
  });
}
