import { learningResponse } from "@/lib/learning-runtime";
import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi } from "@/lib/private-api";
import { getJapaneseStudyReviewPreview } from "@/lib/study/japanese-service";

function handleGET(req: Request) {
  return authenticatedPrivateApi(req, actorId => getJapaneseStudyReviewPreview(prisma, actorId));
}

export function GET(req: Request) {
  return learningResponse(req, "study.overview", () => handleGET(req));
}
