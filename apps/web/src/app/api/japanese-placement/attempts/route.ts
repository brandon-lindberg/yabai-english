import { prisma } from "@/lib/prisma";
import { japanesePlacementHttp, japanesePlacementJson } from "@/lib/japanese-placement/http";
import { getCurrentJapaneseAttempt, startStoredJapaneseAttempt } from "@/lib/japanese-placement/service";

export const GET = (req: Request) => japanesePlacementHttp(req, async (actorId) => ({
  attempt: await getCurrentJapaneseAttempt(prisma, actorId),
}));

export const POST = (req: Request) => japanesePlacementHttp(req, async (actorId) =>
  startStoredJapaneseAttempt(prisma, actorId, await japanesePlacementJson(req)));
