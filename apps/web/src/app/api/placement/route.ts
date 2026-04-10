import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getPlacementQuestionsForClient,
  PLACEMENT_QUESTIONS,
  PLACEMENT_WRITING_TASK,
  scorePlacementAnswers,
} from "@/lib/placement-test";

export async function GET() {
  return NextResponse.json({
    questions: getPlacementQuestionsForClient(),
    writingTask: PLACEMENT_WRITING_TASK,
  });
}

const postSchema = z.object({
  answers: z.array(z.number().int().min(0)).length(PLACEMENT_QUESTIONS.length),
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
