import { prisma } from "@/lib/prisma";
import { japanesePlacementHttp } from "@/lib/japanese-placement/http";
import { getStoredJapaneseAttempt } from "@/lib/japanese-placement/service";

type Context = { params: Promise<{ attemptId: string }> };

export const GET = (req: Request, context: Context) => japanesePlacementHttp(req, async (actorId) =>
  getStoredJapaneseAttempt(prisma, actorId, (await context.params).attemptId));
