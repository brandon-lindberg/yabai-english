import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi, readPrivateApiJson } from "@/lib/private-api";
import { createJapaneseQuickReviewQueue } from "@/lib/study/japanese-service";

import { queuePreparationResponse } from "@/lib/study/queue-preparation-server";

export async function POST(req: Request) {
  return authenticatedPrivateApi(req, async actorId => {
    const input = await readPrivateApiJson(req);
    return queuePreparationResponse(req, report => report ? createJapaneseQuickReviewQueue(prisma, actorId, input, report) : createJapaneseQuickReviewQueue(prisma, actorId, input));
  });
}
