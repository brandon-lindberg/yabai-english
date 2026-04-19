import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountStatus, PlacedLevel, Prisma, Role } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkAdminCanDeleteUser } from "@/lib/admin-user-guards";
import { teacherProfileToAdminDto } from "@/lib/admin-user-dto";
import { invalidateUserSessions } from "@/lib/admin-invalidate-sessions";

const teacherProfilePatchSchema = z
  .object({
    displayName: z.string().min(1).max(100).trim().optional(),
    bio: z.string().max(2000).trim().nullable().optional(),
    countryOfOrigin: z.string().max(80).trim().nullable().optional(),
    credentials: z.string().max(2000).trim().nullable().optional(),
    instructionLanguages: z.array(z.string().min(1).max(20)).max(10).optional(),
    specialties: z.array(z.string().min(1).max(40)).max(20).optional(),
    rateYen: z.number().int().min(0).max(9_999_999).nullable().optional(),
    offersFreeTrial: z.boolean().optional(),
  })
  .strict();

const studentProfilePatchSchema = z
  .object({
    timezone: z.string().max(80).optional(),
    shortBio: z.string().max(300).nullable().optional(),
    placedLevel: z.nativeEnum(PlacedLevel).optional(),
    placedSubLevel: z.number().int().min(1).max(3).nullable().optional(),
    placementNeedsReview: z.boolean().optional(),
    placementReviewReason: z.string().max(1000).nullable().optional(),
  })
  .strict();

const patchBodySchema = z
  .object({
    name: z.string().trim().max(200).nullable().optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    locale: z.string().trim().min(2).max(10).optional(),
    role: z.nativeEnum(Role).optional(),
    accountStatus: z.nativeEnum(AccountStatus).optional(),
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
  if (session.user.role !== "ADMIN") {
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
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { teacherProfile, ...rest } = user;
  return NextResponse.json({
    ...rest,
    teacherProfile: teacherProfileToAdminDto(teacherProfile),
  });
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

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      accountStatus: true,
      studentProfile: { select: { id: true } },
      teacherProfile: { select: { id: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  const nextRole = data.role ?? existing.role;
  const nextAccountStatus = data.accountStatus ?? existing.accountStatus;

  const userUpdate: Prisma.UserUpdateInput = {};
  if (data.name !== undefined) userUpdate.name = data.name;
  if (data.email !== undefined) userUpdate.email = data.email ? data.email.trim().toLowerCase() : null;
  if (data.locale !== undefined) userUpdate.locale = data.locale;
  if (data.role !== undefined) userUpdate.role = data.role;
  if (data.accountStatus !== undefined) userUpdate.accountStatus = data.accountStatus;

  try {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdate,
        });
      }

      if (nextRole === Role.STUDENT && !existing.studentProfile) {
        await tx.studentProfile.create({ data: { userId } });
      }
      if (nextRole === Role.TEACHER && !existing.teacherProfile) {
        await tx.teacherProfile.create({ data: { userId } });
      }

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

      if (nextAccountStatus === AccountStatus.HIDDEN) {
        await invalidateUserSessions(tx, userId);
      }
    });
  } catch (e) {
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

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const adminUserCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  const check = checkAdminCanDeleteUser({
    actorUserId: actorId,
    targetUserId: userId,
    targetRole: target.role,
    adminUserCount,
  });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
