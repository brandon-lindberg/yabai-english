import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  await prisma.teacherProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      onboardingCompletedAt: now,
    },
    update: {
      onboardingCompletedAt: now,
    },
  });

  return NextResponse.json({ ok: true });
}
