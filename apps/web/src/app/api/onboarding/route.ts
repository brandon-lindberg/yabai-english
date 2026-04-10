import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { onboardingPayloadSchema } from "@/lib/onboarding";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = onboardingPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date();
  await prisma.studentProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      timezone: parsed.data.timezone,
      learningGoals: parsed.data.learningGoals,
      notifyLessonReminders: parsed.data.notifyLessonReminders,
      notifyMessages: parsed.data.notifyMessages,
      notifyPayments: parsed.data.notifyPayments,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      recordingConsentAt: now,
      onboardingCompletedAt: now,
    },
    update: {
      timezone: parsed.data.timezone,
      learningGoals: parsed.data.learningGoals,
      notifyLessonReminders: parsed.data.notifyLessonReminders,
      notifyMessages: parsed.data.notifyMessages,
      notifyPayments: parsed.data.notifyPayments,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      recordingConsentAt: now,
      onboardingCompletedAt: now,
    },
  });

  return NextResponse.json({ ok: true });
}
