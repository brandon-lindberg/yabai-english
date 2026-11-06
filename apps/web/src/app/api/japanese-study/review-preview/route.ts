import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi } from "@/lib/private-api";
import { getJapaneseStudyReviewPreview } from "@/lib/study/japanese-service";

export function GET(req: Request) {
  return authenticatedPrivateApi(req, actorId => getJapaneseStudyReviewPreview(prisma, actorId));
}
