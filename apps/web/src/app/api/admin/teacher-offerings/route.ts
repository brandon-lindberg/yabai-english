import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { prisma } from "@/lib/prisma";
import { MIN_PUBLIC_LESSON_RATE_YEN } from "@/lib/lesson-rate-policy";

/**
 * Grants a teacher a class priced below the public minimum.
 *
 * This is the only way such a class can exist. A teacher cannot create one, the
 * rate editor will not show it to them, and their own save leaves it alone —
 * all keyed off `adminRateOverrideByUserId`, which this route stamps.
 *
 * At or above the minimum there is nothing to grant: the teacher can create the
 * class themselves, and should, so it stays theirs to edit.
 */
const grantSchema = z.object({
  teacherId: z.string().min(1),
  durationMin: z.number().int().min(15).max(180),
  rateYen: z.number().int().min(1).max(9_999_999),
  classLevelId: z.string().min(1),
  classTypeId: z.string().min(1),
  isGroup: z.boolean().optional(),
  groupSize: z.number().int().min(2).max(30).nullable().optional(),
  note: z.string().max(2000).trim().nullable().optional(),
});

/**
 * Everything the grant screen needs for one teacher: the taxonomy a concession
 * can hang off, and the concessions already granted.
 */
export async function GET(req: Request) {
  const gate = await requireSuperAdmin();
  if (gate.error) return gate.error;

  const teacherId = new URL(req.url).searchParams.get("teacherId");
  if (!teacherId) {
    return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
  }

  const teacher = await prisma.teacherProfile.findFirst({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const [classLevels, classTypes, grants] = await Promise.all([
    prisma.teacherClassLevel.findMany({
      where: { teacherId: teacher.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
      select: { id: true, labelEn: true, labelJa: true },
    }),
    prisma.teacherClassType.findMany({
      where: { teacherId: teacher.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
      select: { id: true, labelEn: true, labelJa: true },
    }),
    // Concessions only. The teacher's own priced classes are theirs to manage.
    prisma.teacherLessonOffering.findMany({
      where: {
        teacherId: teacher.id,
        active: true,
        adminRateOverrideByUserId: { not: null },
      },
      orderBy: [{ durationMin: "asc" }],
      select: {
        id: true,
        durationMin: true,
        rateYen: true,
        isGroup: true,
        groupSize: true,
        adminRateOverrideByUserId: true,
        adminRateOverrideNote: true,
        classLevel: { select: { labelEn: true, labelJa: true } },
        classType: { select: { labelEn: true, labelJa: true } },
      },
    }),
  ]);

  return NextResponse.json({ classLevels, classTypes, grants });
}

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (gate.error) return gate.error;

  const parsed = grantSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.rateYen >= MIN_PUBLIC_LESSON_RATE_YEN) {
    return NextResponse.json(
      {
        error: `Rates of ¥${MIN_PUBLIC_LESSON_RATE_YEN.toLocaleString()} or more need no exemption — the teacher can create this class themselves.`,
        reason: "NO_EXEMPTION_NEEDED",
      },
      { status: 400 },
    );
  }

  const teacher = await prisma.teacherProfile.findFirst({
    where: { id: data.teacherId },
    select: { id: true },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  // The class hangs off the teacher's own taxonomy, so an availability slot can
  // match it the same way it matches any other class.
  const [level, type] = await Promise.all([
    prisma.teacherClassLevel.findFirst({
      where: { id: data.classLevelId, teacherId: teacher.id },
      select: { id: true },
    }),
    prisma.teacherClassType.findFirst({
      where: { id: data.classTypeId, teacherId: teacher.id },
      select: { id: true },
    }),
  ]);
  if (!level || !type) {
    return NextResponse.json(
      { error: "Class level and type must belong to this teacher." },
      { status: 400 },
    );
  }

  const offering = await prisma.teacherLessonOffering.create({
    data: {
      teacherId: teacher.id,
      durationMin: data.durationMin,
      rateYen: data.rateYen,
      isGroup: data.isGroup ?? false,
      groupSize: data.isGroup ? (data.groupSize ?? null) : null,
      classLevelId: level.id,
      classTypeId: type.id,
      active: true,
      adminRateOverrideByUserId: gate.session.user.id,
      adminRateOverrideNote: data.note?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true, offering });
}

/**
 * Revokes a granted class.
 *
 * Deactivates rather than deletes: `AvailabilitySlot.teacherLessonOfferingId` is
 * `SetNull`, so deleting would leave published hours that still exist but match
 * no class — bookable-looking time that can never be booked. Taking the hours
 * down with it makes the change visible in the teacher's schedule instead.
 */
export async function DELETE(req: Request) {
  const gate = await requireSuperAdmin();
  if (gate.error) return gate.error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const offering = await prisma.teacherLessonOffering.findFirst({
    where: { id },
    select: { id: true, adminRateOverrideByUserId: true },
  });
  if (!offering) {
    return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  }
  if (!offering.adminRateOverrideByUserId) {
    return NextResponse.json(
      {
        error: "That class was priced by the teacher, so it is not an admin grant to revoke.",
        reason: "NOT_A_GRANT",
      },
      { status: 400 },
    );
  }

  await prisma.availabilitySlot.updateMany({
    where: { teacherLessonOfferingId: offering.id },
    data: { active: false },
  });
  await prisma.teacherLessonOffering.update({
    where: { id: offering.id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true, revokedOfferingId: offering.id });
}
