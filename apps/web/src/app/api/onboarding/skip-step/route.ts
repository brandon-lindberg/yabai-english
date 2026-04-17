import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  step: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { step } = parsed.data;

  if (user.role === "STUDENT") {
    await prisma.studentProfile.update({
      where: { userId: user.id },
      data: { skippedOnboardingSteps: { push: step } },
    });
    return NextResponse.json({ ok: true });
  }

  if (user.role === "TEACHER") {
    await prisma.teacherProfile.update({
      where: { userId: user.id },
      data: { skippedOnboardingSteps: { push: step } },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
