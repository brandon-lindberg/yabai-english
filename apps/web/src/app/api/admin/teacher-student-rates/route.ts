import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const rateOverrideSchema = z.object({
  teacherId: z.string().min(1),
  studentId: z.string().min(1),
  teacherLessonOfferingId: z.string().min(1),
  rateYen: z.number().int().min(1).max(9_999_999),
  active: z.boolean().optional(),
  note: z.string().max(2000).trim().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = rateOverrideSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const offering = await prisma.teacherLessonOffering.findFirst({
    where: {
      id: parsed.data.teacherLessonOfferingId,
      teacherId: parsed.data.teacherId,
    },
    select: { id: true },
  });
  if (!offering) {
    return NextResponse.json({ error: "Lesson offering not found" }, { status: 404 });
  }

  const student = await prisma.user.findFirst({
    where: { id: parsed.data.studentId, role: "STUDENT" },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const override = await prisma.teacherStudentLessonRate.upsert({
    where: {
      teacherLessonOfferingId_studentId: {
        teacherLessonOfferingId: parsed.data.teacherLessonOfferingId,
        studentId: parsed.data.studentId,
      },
    },
    create: {
      teacherId: parsed.data.teacherId,
      studentId: parsed.data.studentId,
      teacherLessonOfferingId: parsed.data.teacherLessonOfferingId,
      rateYen: parsed.data.rateYen,
      active: parsed.data.active ?? true,
      note: parsed.data.note ?? null,
      createdByAdminUserId: session.user.id,
    },
    update: {
      rateYen: parsed.data.rateYen,
      active: parsed.data.active ?? true,
      note: parsed.data.note ?? null,
      createdByAdminUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true, override });
}
