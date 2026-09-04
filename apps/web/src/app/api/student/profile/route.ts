import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { STUDENT_SHORT_BIO_MAX_CHARS } from "@/lib/student-short-bio";
import {
  LEARNING_GOALS_NOTE_MAX_CHARS,
  normalizeLearningGoals,
} from "@/lib/student-learning-goals";
import { z } from "zod";

const patchSchema = z.object({
  shortBio: z.string().max(STUDENT_SHORT_BIO_MAX_CHARS).nullable().optional(),
  name: z.string().min(1).max(100).trim().optional(),
  /*
    Teachers read these when they plan a lesson, so a student has to be able to
    change them as their aims change — they used to be writable only during
    onboarding. Validated by the shared list rather than by shape: the body
    arrives from a browser and lands in a column somebody else acts on.
  */
  learningGoals: z.array(z.string()).max(20).optional(),
  /*
    A goal in the student's own words. Rejected rather than truncated when it
    is too long: a silently shortened goal is worse than a refused save,
    because the student believes they said the whole thing.
  */
  learningGoalsNote: z.string().max(LEARNING_GOALS_NOTE_MAX_CHARS).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { shortBio, name, learningGoals, learningGoalsNote } = parsed.data;

  await prisma.$transaction(async (tx) => {
    if (name !== undefined) {
      await tx.user.update({
        where: { id: session.user.id },
        data: { name },
      });
    }
    // One update with whatever was sent: a save that edits only the bio must
    // not blank the goals, and vice versa.
    const profileData: {
      shortBio?: string | null;
      learningGoals?: string[];
      learningGoalsNote?: string | null;
    } = {};
    if (shortBio !== undefined) profileData.shortBio = shortBio === null ? null : shortBio;
    if (learningGoals !== undefined) {
      profileData.learningGoals = normalizeLearningGoals(learningGoals);
    }
    if (learningGoalsNote !== undefined) {
      // Whitespace is not a goal.
      const trimmed = learningGoalsNote?.trim() ?? "";
      profileData.learningGoalsNote = trimmed === "" ? null : trimmed;
    }
    if (Object.keys(profileData).length > 0) {
      await tx.studentProfile.update({
        where: { userId: session.user.id },
        data: profileData,
      });
    }
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/profile`);
  }

  return NextResponse.json({ ok: true });
}
