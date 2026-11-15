import { learningResponse } from "@/lib/learning-runtime";
import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi, readPrivateApiJson } from "@/lib/private-api";
import { submitJapaneseStudyReview } from "@/lib/study/japanese-service";

async function handlePOST(req: Request) {
  return authenticatedPrivateApi(req, async actorId => submitJapaneseStudyReview(prisma, actorId, await readPrivateApiJson(req)));
}

export function POST(req: Request) {
  return learningResponse(req, "study.review", () => handlePOST(req));
}
