import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { TeacherPlatformTier } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  removeTeacherTierOverride,
  setTeacherTierOverride,
} from "@/lib/teacher-tiers";

type Props = {
  params: Promise<{ teacherId: string }>;
};

const overrideSchema = z.object({
  tier: z.nativeEnum(TeacherPlatformTier),
  note: z.string().max(2000).trim().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") return null;
  return session;
}

export async function POST(req: Request, { params }: Props) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teacherId } = await params;
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = overrideSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiresAt && expiresAt <= new Date()) {
    return NextResponse.json({ error: "Override expiry must be in the future" }, { status: 400 });
  }

  await setTeacherTierOverride(prisma as never, {
    teacherId,
    tier: parsed.data.tier,
    actorUserId: session.user.id,
    note: parsed.data.note ?? null,
    expiresAt,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teacherId } = await params;
  await removeTeacherTierOverride(prisma as never, {
    teacherId,
    actorUserId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
