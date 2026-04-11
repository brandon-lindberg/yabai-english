import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlacementBankQuestions } from "@/lib/placement-bank/placement-bank-access";
import { scorePlacementAnswers } from "@/lib/placement-test";
import {
  createPlacementAttemptToken,
  type PlacementAttemptPayload,
  verifyPlacementAttemptToken,
} from "@/lib/placement-attempt-token";
import {
  applyAdaptiveAnswer,
  buildInitialAdaptiveState,
  chooseNextAdaptiveQuestion,
} from "@/lib/placement-adaptive";
import type { LoadedPlacementQuestion } from "@/lib/placement-bank/load-placement-bank";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const RECENT_PLACEMENT_IDS_COOKIE = "placement_recent_ids";
const PLACEMENT_TIME_LIMIT_SECONDS = 20 * 60;

function toPublicQuestion(question: LoadedPlacementQuestion) {
  const { correctIndex, stemId, ...rest } = question;
  void correctIndex;
  void stemId;
  return rest;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bank = await getPlacementBankQuestions();
  const cookieStore = await cookies();
  const recentIds = (cookieStore.get(RECENT_PLACEMENT_IDS_COOKIE)?.value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const adaptiveState = buildInitialAdaptiveState();
  const firstQuestion = chooseNextAdaptiveQuestion(adaptiveState, bank, recentIds);
  if (!firstQuestion) {
    return NextResponse.json({ error: "Question pool unavailable" }, { status: 500 });
  }
  const issuedAt = Date.now();
  const expiresAt = issuedAt + PLACEMENT_TIME_LIMIT_SECONDS * 1000;
  const attemptToken = createPlacementAttemptToken({
    userId: session.user.id,
    issuedAt,
    expiresAt,
    mode: "adaptive",
    currentQuestionId: firstQuestion.id,
    asked: [],
    adaptiveState,
  });

  const response = NextResponse.json(
    {
      question: toPublicQuestion(firstQuestion),
      attemptToken,
      timeLimitSec: PLACEMENT_TIME_LIMIT_SECONDS,
      expiresAt,
      progress: { current: 1, total: adaptiveState.maxQuestions },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
  return response;
}

const answerSchema = z.object({
  action: z.literal("answer"),
  attemptToken: z.string().min(20),
  answer: z.number().int().min(0).max(2),
});

const finishSchema = z.object({
  action: z.literal("finish"),
  attemptToken: z.string().min(20),
});

const postSchema = z.union([answerSchema, finishSchema]);

function verifyAttemptForUser(payload: PlacementAttemptPayload | null, userId: string) {
  if (!payload || payload.userId !== userId) return null;
  return payload;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bank = await getPlacementBankQuestions();
  const cookieStore = await cookies();

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const payload = verifyAttemptForUser(
    verifyPlacementAttemptToken(parsed.data.attemptToken),
    session.user.id,
  );
  if (!payload) {
    return NextResponse.json({ error: "Invalid attempt token" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  if (parsed.data.action === "answer") {
    const currentId = payload.currentQuestionId;
    if (!currentId) {
      return NextResponse.json({ error: "Objective section already complete" }, { status: 400 });
    }
    const currentQuestion = bank.find((q) => q.id === currentId);
    if (!currentQuestion) {
      return NextResponse.json({ error: "Current question not found" }, { status: 400 });
    }
    const nextAdaptiveState = applyAdaptiveAnswer(
      payload.adaptiveState,
      currentQuestion,
      parsed.data.answer === currentQuestion.correctIndex,
    );
    const nextAsked = [...payload.asked, { id: currentQuestion.id, answer: parsed.data.answer }];
    const recentIds = (cookieStore.get(RECENT_PLACEMENT_IDS_COOKIE)?.value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const nextQuestion = chooseNextAdaptiveQuestion(nextAdaptiveState, bank, recentIds);
    const nextToken = createPlacementAttemptToken({
      ...payload,
      currentQuestionId: nextQuestion?.id ?? null,
      asked: nextAsked,
      adaptiveState: nextAdaptiveState,
    });
    return NextResponse.json({
      attemptToken: nextToken,
      question: nextQuestion ? toPublicQuestion(nextQuestion) : null,
      objectiveComplete: !nextQuestion,
      progress: {
        current: nextAsked.length + (nextQuestion ? 1 : 0),
        total: nextAdaptiveState.maxQuestions,
      },
      expiresAt: payload.expiresAt,
    });
  }

  const selectedQuestions = payload.asked
    .map((item) => bank.find((q) => q.id === item.id))
    .filter((q): q is LoadedPlacementQuestion => Boolean(q));
  const selectedAnswers = payload.asked.map((item) => item.answer);
  const result = scorePlacementAnswers(selectedAnswers, selectedQuestions);

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: {
      placedLevel: result.level,
      placedSubLevel: result.subLevel,
      placementCompletedAt: new Date(),
      placementNeedsReview: result.needsManualReview,
      placementReviewReason: result.manualReviewReasons.join(", "),
      placementReport: {
        earned: result.earned,
        max: result.max,
        subLevel: result.subLevel,
        sectionScores: result.sectionScores,
        strengths: result.strengths,
        improvements: result.improvements,
        manualReviewReasons: result.manualReviewReasons,
      },
      placementWritingSample: null,
    },
  });

  cookieStore.set(
    RECENT_PLACEMENT_IDS_COOKIE,
    selectedQuestions.map((q) => q.id).join(","),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    },
  );

  return NextResponse.json(result);
}
