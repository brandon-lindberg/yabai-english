import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptRefreshToken } from "@/lib/calendar-token";
import { z } from "zod";
import { Role } from "@prisma/client";

const bodySchema = z.object({
  refreshToken: z.string().min(10),
  calendarId: z.string().optional(),
});

/**
 * Admin-only token storage endpoint (legacy/manual fallback).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let teacher = await prisma.teacherProfile.findFirst({
    where: { userId: session.user.id },
  });

  if (!teacher && session.user.role === Role.ADMIN) {
    teacher = await prisma.teacherProfile.findFirst();
  }

  if (!teacher) {
    return NextResponse.json(
      { error: "No teacher profile for this user" },
      { status: 400 },
    );
  }

  const enc = encryptRefreshToken(parsed.data.refreshToken.trim());
  await prisma.teacherProfile.update({
    where: { id: teacher.id },
    data: {
      googleCalendarRefreshToken: enc,
      calendarId: parsed.data.calendarId ?? teacher.calendarId,
    },
  });

  return NextResponse.json({ ok: true });
}
