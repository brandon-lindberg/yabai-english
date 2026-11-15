import { learningResponse } from "@/lib/learning-runtime";
import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi } from "@/lib/private-api";
import { getJapaneseStudyOverview } from "@/lib/study/japanese-service";

async function handleGET(req: Request) {
  return authenticatedPrivateApi(req, actorId => getJapaneseStudyOverview(prisma, actorId));
}

export function GET(req: Request) {
  return learningResponse(req, "study.overview", () => handleGET(req));
}
