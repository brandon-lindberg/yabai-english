import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi, readPrivateApiJson } from "@/lib/private-api";
import { createJapaneseQuickReviewQueue } from "@/lib/study/japanese-service";

export async function POST(req: Request) {
  return authenticatedPrivateApi(req, async actorId => createJapaneseQuickReviewQueue(prisma, actorId, await readPrivateApiJson(req)));
}
