import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/auth";
import { englishLearningAccessError } from "@/lib/english-learning-access";
import { prisma } from "@/lib/prisma";
import { getPlacementBankQuestions } from "@/lib/placement-bank/placement-bank-access";
import { scorePlacementAnswers } from "@/lib/placement-test";
import { ENGLISH_PLACEMENT_POLICY_V2, englishPlacementEvidence } from "@/lib/placement-policy";
import {
  createPlacementAttemptToken,
  placementBankDigest,
  type PlacementAttemptPayload,
  verifyPlacementAttemptToken,
} from "@/lib/placement-attempt-token";
import {
  applyAdaptiveAnswer,
  buildInitialAdaptiveState,
  chooseNextAdaptiveQuestion,
  ENGLISH_STAIRCASE_ROUTING_REVISION,
} from "@/lib/placement-adaptive";
import type { LoadedPlacementQuestion } from "@/lib/placement-bank/load-placement-bank";
import {
  isPlacementRetakeAllowed,
  placementRetakeEligibleAt,
} from "@/lib/placement-cooldown";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const RECENT_PLACEMENT_IDS_COOKIE = "placement_recent_ids";
const PLACEMENT_TIME_LIMIT_SECONDS = ENGLISH_PLACEMENT_POLICY_V2.timeLimitSec;

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
  const languageError = englishLearningAccessError(session.user.learningLanguage);
  if (languageError) return languageError;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { placementCompletedAt: true },
  });
  const completedAt = profile?.placementCompletedAt ?? null;
  if (completedAt && !isPlacementRetakeAllowed(completedAt)) {
    return NextResponse.json(
      {
        error: "cooldown",
        eligibleAt: placementRetakeEligibleAt(completedAt).toISOString(),
      },
      { status: 403 },
    );
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
    scoringVersion: ENGLISH_PLACEMENT_POLICY_V2.version,
    routingRevision: ENGLISH_STAIRCASE_ROUTING_REVISION,
    bankDigest: placementBankDigest(bank),
    currentQuestionId: firstQuestion.id,
    asked: [],
    adaptiveState,
  });

  const response = NextResponse.json(
    {
      question: toPublicQuestion(firstQuestion),
      attemptToken,
      timeLimitSec: PLACEMENT_TIME_LIMIT_SECONDS,
      minimumAnswers: ENGLISH_PLACEMENT_POLICY_V2.minimumAnswers,
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
  const languageError = englishLearningAccessError(session.user.learningLanguage);
  if (languageError) return languageError;

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
  if (payload.scoringVersion !== ENGLISH_PLACEMENT_POLICY_V2.version || payload.bankDigest !== placementBankDigest(bank)) {
    return NextResponse.json({ error: "attempt_unavailable" }, { status: 409 });
  }
  if ((payload.routingRevision === ENGLISH_STAIRCASE_ROUTING_REVISION) !== Boolean(payload.adaptiveState.staircase) ||
    (payload.routingRevision !== undefined && payload.routingRevision !== ENGLISH_STAIRCASE_ROUTING_REVISION)) {
    return NextResponse.json({ error: "attempt_unavailable" }, { status: 409 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const now = Date.now();
  const expired = now >= payload.expiresAt;
  if (parsed.data.action === "answer") {
    if (expired) {
      return NextResponse.json(
        { error: "attempt_expired", expiresAt: payload.expiresAt },
        { status: 409 },
      );
    }
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
  const evidence = englishPlacementEvidence(selectedAnswers, selectedQuestions);
  if (!evidence.valid) {
    return NextResponse.json({ error: "attempt_unavailable" }, { status: 409 });
  }
  const complete = payload.currentQuestionId === null && evidence.complete;
  if (!complete) {
    if (!expired && payload.currentQuestionId !== null) {
      return NextResponse.json(
        { error: "attempt_incomplete", expiresAt: payload.expiresAt, serverNow: now },
        { status: 409 },
      );
    }
    const poolExhausted = payload.currentQuestionId === null;
    if (poolExhausted || !evidence.sufficient) {
      return NextResponse.json({
        status: "inconclusive",
        reason: poolExhausted ? "question_pool_exhausted" : "insufficient_evidence",
        answered: selectedQuestions.length,
        required: ENGLISH_PLACEMENT_POLICY_V2.minimumAnswers,
      });
    }
  }

  const result = scorePlacementAnswers(selectedAnswers, selectedQuestions, {
    version: ENGLISH_PLACEMENT_POLICY_V2.version,
    completionReason: complete ? "completed" : "timeout",
  });

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: {
      placedLevel: result.level,
      placedSubLevel: result.subLevel,
      placementCompletedAt: new Date(now),
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
        assessment: result.assessment,
        bankDigest: payload.bankDigest,
        routingRevision: payload.routingRevision ?? "english-per-skill-v1",
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
