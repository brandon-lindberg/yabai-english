import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  step: z.string().min(1),
  /**
   * Whether the step should be recorded as handled. Defaults to true, which is
   * what "skip" has always meant.
   *
   * Teacher onboarding is self-reported, and ticking a box is the same claim as
   * skipping one — but only skipping was ever written down, so the checkboxes
   * reset whenever the component remounted. `false` is the untick, because a
   * checkbox that cannot be cleared is not a checkbox.
   */
  done: z.boolean().optional(),
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

  const done = parsed.data.done ?? true;

  /*
    Read, compute, set — rather than `push`. `push` cannot remove, and it also
    grew the array by one on every tick/untick/tick cycle, so a teacher who
    changed their mind twice ended up with the same step recorded three times.
  */
  const nextSteps = (current: readonly string[]) => {
    const without = current.filter((s) => s !== step);
    return done ? [...without, step] : without;
  };

  if (user.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { skippedOnboardingSteps: true },
    });
    await prisma.studentProfile.update({
      where: { userId: user.id },
      data: {
        skippedOnboardingSteps: { set: nextSteps(profile?.skippedOnboardingSteps ?? []) },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (user.role === "TEACHER") {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      select: { skippedOnboardingSteps: true },
    });
    await prisma.teacherProfile.update({
      where: { userId: user.id },
      data: {
        skippedOnboardingSteps: { set: nextSteps(profile?.skippedOnboardingSteps ?? []) },
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
