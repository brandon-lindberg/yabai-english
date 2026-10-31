import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/auth";
import { englishLearningAccessError } from "@/lib/english-learning-access";
import { prisma } from "@/lib/prisma";
import { getPlacementBankQuestions } from "@/lib/placement-bank/placement-bank-access";
import { EnglishPlacementFailure, getOrStartEnglishAttempt, submitEnglishAttempt } from "@/lib/english-placement/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const recentCookie = "placement_recent_ids";
const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("answer"), attemptToken: z.string().min(20).max(10_000), answer: z.number().int().min(0).max(2) }).strict(),
  z.object({ action: z.literal("finish"), attemptToken: z.string().min(20).max(10_000) }).strict(),
]);

async function run(req?: Request) {
  const send = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
  const session = await auth();
  if (!session?.user?.id) return send({ error: "Unauthorized" }, 401);
  const languageError = englishLearningAccessError(session.user.learningLanguage);
  if (languageError) return languageError;
  const store = await cookies();
  const recentIds = (store.get(recentCookie)?.value ?? "").split(",").map(id => id.trim()).filter(Boolean);
  const parsed = req ? postSchema.safeParse(await req.json().catch(() => null)) : null;
  if (parsed && !parsed.success) return send({ error: "Invalid body" }, 400);
  try {
    const result = parsed?.success
      ? await submitEnglishAttempt(prisma, session.user.id, parsed.data, recentIds)
      : await getOrStartEnglishAttempt(prisma, session.user.id, getPlacementBankQuestions, recentIds);
    if (result.recentIds) store.set(recentCookie, result.recentIds.join(","), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
    return send(result.body);
  } catch (error) {
    if (error instanceof EnglishPlacementFailure) return send({ error: error.code, ...error.details }, error.status);
    console.error("English placement request failed", error);
    return send({ error: "attempt_unavailable" }, 500);
  }
}

export async function GET() { return run(); }
export async function POST(req: Request) { return run(req); }
