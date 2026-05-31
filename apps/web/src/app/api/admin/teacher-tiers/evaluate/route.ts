import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateDueTeacherTier } from "@/lib/teacher-tiers";

const evaluateSchema = z.object({
  teacherId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => ({}))) as unknown;
  const parsed = evaluateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const teachers = parsed.data.teacherId
    ? await prisma.teacherProfile.findMany({
        where: { id: parsed.data.teacherId },
        select: { id: true },
      })
    : await prisma.teacherProfile.findMany({
        select: { id: true },
        orderBy: { userId: "asc" },
      });

  const results = [];
  for (const teacher of teachers) {
    results.push(await evaluateDueTeacherTier(prisma as never, { teacherId: teacher.id }));
  }

  return NextResponse.json({ ok: true, evaluated: results });
}
