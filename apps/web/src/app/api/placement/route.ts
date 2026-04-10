import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildPlacementQuestionSet,
  getPlacementQuestionsForClient,
  PLACEMENT_QUESTIONS,
  PLACEMENT_WRITING_TASK,
  scorePlacementAnswers,
} from "@/lib/placement-test";
import {
  createPlacementAttemptToken,
  verifyPlacementAttemptToken,
} from "@/lib/placement-attempt-token";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const questionSet = buildPlacementQuestionSet();
  const attemptToken = createPlacementAttemptToken({
    userId: session.user.id,
    questionIds: questionSet.map((q) => q.id),
    issuedAt: Date.now(),
  });

  return NextResponse.json({
    questions: getPlacementQuestionsForClient().filter((q) =>
      questionSet.some((selected) => selected.id === q.id),
    ),
    writingTask: PLACEMENT_WRITING_TASK,
    attemptToken,
  });
}

const postSchema = z.object({
  answers: z.array(z.number().int().min(0)),
  attemptToken: z.string().min(20),
  writingResponse: z.string().trim().max(2000).optional().default(""),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }
  const payload = verifyPlacementAttemptToken(parsed.data.attemptToken);
  if (!payload || payload.userId !== session.user.id) {
    return NextResponse.json({ error: "Invalid attempt token" }, { status: 400 });
  }
  const selectedQuestions = payload.questionIds
    .map((id) => PLACEMENT_QUESTIONS.find((q) => q.id === id))
    .filter((q): q is (typeof PLACEMENT_QUESTIONS)[number] => Boolean(q));
  if (selectedQuestions.length !== parsed.data.answers.length) {
    return NextResponse.json({ error: "Answer count mismatch" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const result = scorePlacementAnswers(
    parsed.data.answers,
    parsed.data.writingResponse,
    selectedQuestions,
  );

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: {
      placedLevel: result.level,
      placementCompletedAt: new Date(),
      placementNeedsReview: result.needsManualReview,
      placementReviewReason: result.manualReviewReasons.join(", "),
      placementReport: {
        earned: result.earned,
        max: result.max,
        sectionScores: result.sectionScores,
        strengths: result.strengths,
        improvements: result.improvements,
        writingFeedback: result.writingFeedback,
        manualReviewReasons: result.manualReviewReasons,
      },
      placementWritingSample: parsed.data.writingResponse,
    },
  });

  return NextResponse.json(result);
}
