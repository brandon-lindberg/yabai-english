import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugifyTaxonomyCode } from "@/lib/slugify-taxonomy-code";

const createSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(100),
    labelJa: z.string().trim().max(100).optional().nullable(),
    code: z.string().trim().min(1).max(64).optional(),
  })
  .strip();

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

export async function GET(): Promise<NextResponse> {
  const guard = await requireTeacherProfile();
  if (!guard.ok) return guard.res;

  const classTypes = await prisma.teacherClassType.findMany({
    where: { teacherId: guard.teacherId, active: true },
    orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
  });
  return NextResponse.json({ classTypes });
}

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireTeacherProfile();
  if (!guard.ok) return guard.res;
  const teacherId = guard.teacherId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const code =
    (parsed.data.code && slugifyTaxonomyCode(parsed.data.code)) ||
    slugifyTaxonomyCode(parsed.data.labelEn);
  if (!code) {
    return NextResponse.json(
      { error: "Name must contain at least one letter or digit." },
      { status: 400 },
    );
  }

  const existing = await prisma.teacherClassType.findUnique({
    where: { teacherId_code: { teacherId, code } },
    select: { id: true, active: true },
  });

  if (existing?.active) {
    return NextResponse.json(
      { error: "A class type with this name already exists." },
      { status: 409 },
    );
  }

  const last = await prisma.teacherClassType.findMany({
    where: { teacherId },
    orderBy: { sortOrder: "desc" },
    take: 1,
    select: { sortOrder: true },
  });
  const sortOrder = (last[0]?.sortOrder ?? -1) + 1;

  const data = {
    code,
    labelEn: parsed.data.labelEn,
    labelJa: parsed.data.labelJa ?? null,
    sortOrder,
  };

  if (existing) {
    const classType = await prisma.teacherClassType.update({
      where: { id: existing.id },
      data: { ...data, active: true },
    });
    return NextResponse.json({ classType }, { status: 201 });
  }

  const classType = await prisma.teacherClassType.create({
    data: { teacherId, ...data },
  });

  return NextResponse.json({ classType }, { status: 201 });
}
