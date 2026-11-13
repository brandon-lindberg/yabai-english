import { prisma } from "@/lib/prisma";
import { authenticatedPrivateApi, readPrivateApiJson } from "@/lib/private-api";
import { createJapaneseStudyQueue } from "@/lib/study/japanese-service";

export async function POST(req: Request) {
  return authenticatedPrivateApi(req, async actorId => createJapaneseStudyQueue(prisma, actorId, await readPrivateApiJson(req)));
}
