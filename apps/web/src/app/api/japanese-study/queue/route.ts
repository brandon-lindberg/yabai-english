import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi, readPrivateApiJson } from "@/lib/private-api";
import { createJapaneseStudyQueue } from "@/lib/study/japanese-service";

import { queuePreparationResponse } from "@/lib/study/queue-preparation-server";

export async function POST(req: Request) {
  return authenticatedPrivateApi(req, async actorId => {
    const input = await readPrivateApiJson(req);
    return queuePreparationResponse(req, report => report ? createJapaneseStudyQueue(prisma, actorId, input, report) : createJapaneseStudyQueue(prisma, actorId, input));
  });
}
