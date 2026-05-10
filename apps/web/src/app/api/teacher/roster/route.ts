import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { normalizeRosterInviteEmail } from "@/lib/claim-teacher-roster-invites";

const postSchema = z.object({
  email: z.string().email().max(320),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No teacher profile" }, { status: 404 });
  }

  const entries = await prisma.teacherRosterEntry.findMany({
    where: { teacherId: profile.id },
    include: {
      student: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      status: e.studentId ? ("active" as const) : ("pending" as const),
      displayName: e.student?.name ?? null,
      email: e.student?.email ?? e.invitedEmail,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No teacher profile" }, { status: 404 });
  }

  const normalized = normalizeRosterInviteEmail(parsed.data.email);

  const student = await prisma.user.findFirst({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      role: Role.STUDENT,
    },
    select: { id: true, email: true },
  });

  try {
    if (student) {
      await prisma.$transaction(async (tx) => {
        await tx.teacherRosterEntry.deleteMany({
          where: {
            teacherId: profile.id,
            studentId: null,
            invitedEmail: { equals: normalized, mode: "insensitive" },
          },
        });
        await tx.teacherRosterEntry.upsert({
          where: {
            teacherId_studentId: {
              teacherId: profile.id,
              studentId: student.id,
            },
          },
          create: {
            teacherId: profile.id,
            studentId: student.id,
          },
          update: {},
        });
      });
    } else {
      const existingPending = await prisma.teacherRosterEntry.findFirst({
        where: {
          teacherId: profile.id,
          studentId: null,
          invitedEmail: { equals: normalized, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (existingPending) {
        return NextResponse.json(
          { error: "This email is already invited." },
          { status: 409 },
        );
      }

      await prisma.teacherRosterEntry.create({
        data: {
          teacherId: profile.id,
          invitedEmail: normalized,
        },
      });
    }
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      return NextResponse.json({ error: "Already on your student list." }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
