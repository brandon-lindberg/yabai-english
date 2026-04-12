import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyQuickReviewOutcome } from "@/lib/study/quick-review";
import { z } from "zod";

const bodySchema = z.object({
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cardId: z.string().min(1),
  outcome: z.enum(["learned", "not_yet"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await applyQuickReviewOutcome(prisma, session.user.id, parsed.data);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    cards: result.cards,
    learnedToday: result.learnedToday,
    notYetToday: result.notYetToday,
  });
}
