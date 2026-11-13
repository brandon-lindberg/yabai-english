import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { englishLearningAccessError } from "@/lib/english-learning-access";
import { prisma } from "@/lib/prisma";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { prepareEnglishStudyQueue } from "@/lib/study/english-queue";
import { queuePreparationResponse } from "@/lib/study/queue-preparation-server";
import { StudyLevelCode } from "@/generated/prisma/client";
import { z } from "zod";

const querySchema = z.object({
  trackSlug: z.string().min(1).default("english-flashcards"),
  levelCode: z.nativeEnum(StudyLevelCode),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  focus: z.enum(["mixed", "weak", "mastered"]).default("mixed"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const languageError = englishLearningAccessError(session.user.learningLanguage);
  if (languageError) return languageError;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    trackSlug: url.searchParams.get("trackSlug") ?? undefined,
    levelCode: url.searchParams.get("levelCode") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    focus: url.searchParams.get("focus") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const track = await prisma.studyTrack.findUnique({
    where: { slug: parsed.data.trackSlug, learningLanguage: "ENGLISH", publicationStatus: "PUBLISHED" },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const level = await prisma.studyLevel.findUnique({
    where: { trackId_levelCode: { trackId: track.id, levelCode: parsed.data.levelCode } },
  });
  if (!level) {
    return NextResponse.json({ error: "Level not found" }, { status: 404 });
  }

  const unlocked = await isStudyLevelUnlocked(prisma, session.user.id, track.id, level.levelCode);
  if (!unlocked) {
    return NextResponse.json({ error: "Level locked" }, { status: 403 });
  }

  await prisma.userStudyLevelProgress.upsert({
    where: { userId_levelId: { userId: session.user.id, levelId: level.id } },
    create: { userId: session.user.id, levelId: level.id },
    update: {},
  });

  const result = await queuePreparationResponse(req, async report => ({ ...await prepareEnglishStudyQueue(prisma, session.user.id, level.id, parsed.data, report), levelCode: level.levelCode }));
  return result instanceof Response ? result : NextResponse.json({ ...result, levelCode: level.levelCode }, { headers: { "Cache-Control": "private, no-store" } });
}
