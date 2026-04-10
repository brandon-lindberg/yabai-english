import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getPlacementQuestionsForClient,
  PLACEMENT_QUESTIONS,
  scorePlacementAnswers,
} from "@/lib/placement-test";

export async function GET() {
  return NextResponse.json({
    questions: getPlacementQuestionsForClient(),
  });
}

const postSchema = z.object({
  answers: z.array(z.number().int().min(0)).length(PLACEMENT_QUESTIONS.length),
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

  const { level, earned, max } = scorePlacementAnswers(parsed.data.answers);

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: {
      placedLevel: level,
      placementCompletedAt: new Date(),
    },
  });

  return NextResponse.json({ level, earned, max });
}
