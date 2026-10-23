import { prisma } from "@/lib/prisma";
import { japanesePlacementHttp, japanesePlacementJson } from "@/lib/japanese-placement/http";
import { submitStoredJapaneseResponse } from "@/lib/japanese-placement/service";

type Context = { params: Promise<{ attemptId: string }> };

export const POST = (req: Request, context: Context) => japanesePlacementHttp(req, async (actorId) =>
  submitStoredJapaneseResponse(prisma, actorId, (await context.params).attemptId, await japanesePlacementJson(req)));
