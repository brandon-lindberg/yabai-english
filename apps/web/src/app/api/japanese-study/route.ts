import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi } from "@/lib/private-api";
import { getJapaneseStudyOverview } from "@/lib/study/japanese-service";

export async function GET(req: Request) {
  return authenticatedPrivateApi(req, actorId => getJapaneseStudyOverview(prisma, actorId));
}
