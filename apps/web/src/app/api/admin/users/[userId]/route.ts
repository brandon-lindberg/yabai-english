import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountStatus, PlacedLevel, Prisma, Role } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { provisionRoleProfile } from "@/lib/admin/provision-role-profile";
import { checkAdminCanDeleteUser } from "@/lib/admin-user-guards";
import { teacherProfileToAdminDto } from "@/lib/admin-user-dto";
import { invalidateUserSessions } from "@/lib/admin-invalidate-sessions";
import { validatePublicLessonRateYen } from "@/lib/lesson-rate-policy";
import {
  PLACEMENT_NOTE_MAX_CHARS,
  TEACHER_BIO_MAX_CHARS,
  TEACHER_CREDENTIALS_MAX_CHARS,
} from "@/lib/markdown/limits";
import { STUDENT_SHORT_BIO_MAX_CHARS } from "@/lib/student-short-bio";
import { teachingLanguagesSchema } from "@/lib/learning-language";
import { countActiveAdmins, lockAdminAccountChanges } from "@/lib/admin/account-access";
import { PrivateApiFailure } from "@/lib/private-api-error";
import { adminLessonsForPerson, upcomingAdminLessonsWhere } from "@/lib/admin/lesson-filters";
import { adminPaymentRecoveryWhere } from "@/lib/refund-recovery";
import { teacherMarketplaceVisibilityPatch } from "@/lib/teacher-marketplace-booking-access";
import { loadAdminStudentOverview } from "@/lib/admin/student-overview";
import { loadAdminTeacherOverview } from "@/lib/admin/teacher-overview";

const teacherProfilePatchSchema = z
  .object({
    displayName: z.string().min(1).max(100).trim().optional(),
    bio: z.string().max(TEACHER_BIO_MAX_CHARS).trim().nullable().optional(),
    countryOfOrigin: z.string().max(80).trim().nullable().optional(),
    credentials: z.string().max(TEACHER_CREDENTIALS_MAX_CHARS).trim().nullable().optional(),
    instructionLanguages: z.array(z.string().min(1).max(20)).max(10).optional(),
    teachingLanguages: teachingLanguagesSchema.optional(),
    specialties: z.array(z.string().min(1).max(40)).max(20).optional(),
    rateYen: z.number().int().min(0).max(9_999_999).nullable().optional(),
    offersFreeTrial: z.boolean().optional(),
    ...teacherMarketplaceVisibilityPatch,
  })
  .strict();

const studentProfilePatchSchema = z
  .object({
    timezone: z.string().max(80).optional(),
    shortBio: z.string().max(STUDENT_SHORT_BIO_MAX_CHARS).nullable().optional(),
    placedLevel: z.nativeEnum(PlacedLevel).optional(),
    placedSubLevel: z.number().int().min(1).max(3).nullable().optional(),
    placementNeedsReview: z.boolean().optional(),
    placementReviewReason: z.string().max(PLACEMENT_NOTE_MAX_CHARS).nullable().optional(),
  })
  .strict();

const patchBodySchema = z
  .object({
    name: z.string().trim().max(200).nullable().optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    locale: z.string().trim().min(2).max(10).optional(),
    role: z.nativeEnum(Role).optional(),
    accountStatus: z.enum([AccountStatus.ACTIVE, AccountStatus.HIDDEN]).optional(),
    studentProfile: studentProfilePatchSchema.optional(),
    teacherProfile: teacherProfilePatchSchema.optional(),
  })
  .strict();

type Props = {
  params: Promise<{ userId: string }>;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET(_req: Request, { params }: Props) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      teacherProfile: true,
      googleIntegrationSettings: { select: { calendarConnected: true, meetConnected: true, driveConnected: true } },
      adminAccessEvents: { orderBy: { id: "desc" }, take: 10 },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { teacherProfile, adminAccessEvents, googleIntegrationSettings, ...rest } = user;
  const [studentOverview, teacherOverview] = await Promise.all([
    user.role === "STUDENT" ? loadAdminStudentOverview(prisma, user.id, user.studentProfile) : null,
    user.role === "TEACHER" && teacherProfile ? loadAdminTeacherOverview(prisma, teacherProfile, user.accountStatus, googleIntegrationSettings) : null,
  ]);
  const actors = adminAccessEvents?.length ? await prisma.user.findMany({
    where: { id: { in: [...new Set(adminAccessEvents.map(({ actorId }) => actorId))] } },
    select: { id: true, name: true, email: true },
  }) : [];
  const actorNames = new Map(actors.map(({ id, name, email }) => [id, name ?? email ?? id]));
  const participants = adminLessonsForPerson(userId);
  const followUp = user.accountStatus === "SUSPENDED" ? await Promise.all([
    prisma.booking.count({
      where: { ...participants, ...upcomingAdminLessonsWhere(new Date()) },
    }),
    prisma.payment.count({ where: adminPaymentRecoveryWhere({ person: userId }) }),
  ]).then(([upcomingLessons, unresolvedPayments]) => ({ upcomingLessons, unresolvedPayments })) : null;
  return NextResponse.json({
    ...rest,
    teacherProfile: teacherProfileToAdminDto(teacherProfile),
    adminAccessEvents: adminAccessEvents?.map((event) => ({ ...event, actorName: actorNames.get(event.actorId) })),
    studentOverview,
    teacherOverview,
    followUp,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(req: Request, { params }: Props) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { userId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = parsed.data;
  const rateCheck = validatePublicLessonRateYen(data.teacherProfile?.rateYen);
  if (!rateCheck.ok) {
    return NextResponse.json({ error: rateCheck.error }, { status: 400 });
  }

  const userUpdate: Prisma.UserUpdateInput = {};
  if (data.name !== undefined) userUpdate.name = data.name;
  if (data.email !== undefined) userUpdate.email = data.email ? data.email.trim().toLowerCase() : null;
  if (data.locale !== undefined) userUpdate.locale = data.locale;
  if (data.role !== undefined) userUpdate.role = data.role;
  if (data.accountStatus !== undefined) userUpdate.accountStatus = data.accountStatus;

  try {
    await prisma.$transaction(async (tx) => {
      await lockAdminAccountChanges(tx, gate.session.user.id);
      const existing = await tx.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          role: true,
          accountStatus: true,
          studentProfile: { select: { id: true } },
          teacherProfile: { select: { id: true } },
        },
      });
      if (!existing) throw new PrivateApiFailure(404, "Not found");

      const nextRole = data.role ?? existing.role;
      const nextAccountStatus = data.accountStatus ?? existing.accountStatus;
      if (existing.accountStatus === "SUSPENDED" && (
        nextAccountStatus !== "SUSPENDED" || nextRole !== existing.role ||
        (data.email !== undefined && userUpdate.email !== existing.email)
      )) {
        throw new PrivateApiFailure(409, "Reinstate this account before changing its email, role, or access.");
      }
      if (nextRole === Role.TEACHER && existing.role !== Role.TEACHER && !data.teacherProfile?.teachingLanguages) {
        throw new PrivateApiFailure(400, "Select the teacher's teaching languages");
      }
      if (existing.role === Role.SUPER_ADMIN && existing.accountStatus === AccountStatus.ACTIVE &&
        (nextRole !== Role.SUPER_ADMIN || nextAccountStatus !== AccountStatus.ACTIVE) &&
        await countActiveAdmins(tx) <= 1) {
        throw new PrivateApiFailure(403, "Cannot remove access for the last active admin.");
      }
      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdate,
        });
      }

      // Shared with the create endpoint: what a role needs beyond the column
      // is the same whether the account is new or changing.
      await provisionRoleProfile(tx as never, {
        userId,
        role: nextRole,
        teachingLanguages: data.teacherProfile?.teachingLanguages,
        hasProfile:
          nextRole === Role.STUDENT
            ? Boolean(existing.studentProfile)
            : Boolean(existing.teacherProfile),
      });

      if (
        data.studentProfile &&
        Object.keys(data.studentProfile).length > 0 &&
        nextRole === Role.STUDENT
      ) {
        await tx.studentProfile.update({
          where: { userId },
          data: data.studentProfile,
        });
      }

      if (
        data.teacherProfile &&
        Object.keys(data.teacherProfile).length > 0 &&
        nextRole === Role.TEACHER
      ) {
        await tx.teacherProfile.update({
          where: { userId },
          data: data.teacherProfile,
        });
      }

      if (nextAccountStatus === AccountStatus.HIDDEN || nextRole !== existing.role) {
        await invalidateUserSessions(tx, userId);
      }
    });
  } catch (e) {
    if (e instanceof PrivateApiFailure) return NextResponse.json({ error: e.code }, { status: e.status });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }
    throw e;
  }

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true, teacherProfile: true },
  });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { teacherProfile, ...rest } = updated;
  return NextResponse.json({
    ...rest,
    teacherProfile: teacherProfileToAdminDto(teacherProfile),
  });
}

export async function DELETE(_req: Request, { params }: Props) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const actorId = gate.session.user.id;

  const { userId } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      await lockAdminAccountChanges(tx, actorId);
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true, accountStatus: true },
      });
      if (!target) throw new PrivateApiFailure(404, "Not found");
      if (target.accountStatus === "SUSPENDED") {
        throw new PrivateApiFailure(409, "Reinstate this account before deleting it.");
      }
      const check = checkAdminCanDeleteUser({
        actorUserId: actorId,
        targetUserId: userId,
        targetRole: target.role,
        adminUserCount: await countActiveAdmins(tx),
      });
      if (!check.ok) throw new PrivateApiFailure(check.status, check.error);
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (e) {
    if (e instanceof PrivateApiFailure) return NextResponse.json({ error: e.code }, { status: e.status });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
