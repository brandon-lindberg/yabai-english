import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  code: z.string().trim().min(1).max(64).optional(),
  labelEn: z.string().trim().min(1).max(100).optional(),
  labelJa: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ levelId: string }> };

async function requireTeacherProfile(): Promise<
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
    return { ok: false, res: NextResponse.json({ error: "Teacher profile not found" }, { status: 404 }) };
  }
  return { ok: true, teacherId: profile.id };
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const guard = await requireTeacherProfile();
  if (!guard.ok) return guard.res;

  const { levelId } = await ctx.params;
  const existing = await prisma.teacherClassLevel.findUnique({
    where: { id: levelId },
    select: { id: true, teacherId: true },
  });
  if (!existing || existing.teacherId !== guard.teacherId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const classLevel = await prisma.teacherClassLevel.update({
    where: { id: levelId },
    data: parsed.data,
  });

  return NextResponse.json({ classLevel });
}

export async function DELETE(_req: Request, ctx: RouteContext): Promise<NextResponse> {
  const guard = await requireTeacherProfile();
  if (!guard.ok) return guard.res;

  const { levelId } = await ctx.params;
  const existing = await prisma.teacherClassLevel.findUnique({
    where: { id: levelId },
    select: { id: true, teacherId: true },
  });
  if (!existing || existing.teacherId !== guard.teacherId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.teacherClassLevel.update({
    where: { id: levelId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
