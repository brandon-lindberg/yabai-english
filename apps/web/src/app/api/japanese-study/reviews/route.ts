import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi, readPrivateApiJson } from "@/lib/private-api";
import { submitJapaneseStudyReview } from "@/lib/study/japanese-service";

export async function POST(req: Request) {
  return authenticatedPrivateApi(req, async actorId => submitJapaneseStudyReview(prisma, actorId, await readPrivateApiJson(req)));
}
