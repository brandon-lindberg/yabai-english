import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudyTrackOverview } from "@/lib/study/get-overview";
import { z } from "zod";

const querySchema = z.object({
  trackSlug: z.string().min(1).default("english-flashcards"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ trackSlug: url.searchParams.get("trackSlug") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const overview = await getStudyTrackOverview(prisma, session.user.id, parsed.data.trackSlug);
  if (!overview) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  return NextResponse.json({
    track: overview.track,
    rpg: overview.rpg,
    levels: overview.levels.map((l) => ({
      ...l,
      assessmentPassedAt: l.assessmentPassedAt?.toISOString() ?? null,
      completedAt: l.completedAt?.toISOString() ?? null,
    })),
  });
}
