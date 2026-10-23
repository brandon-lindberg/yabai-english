import { prisma } from "@/lib/prisma";
import { japanesePlacementHttp } from "@/lib/japanese-placement/http";
import { getTeacherJapaneseResult } from "@/lib/japanese-placement/service";

type Context = { params: Promise<{ studentId: string }> };

export const GET = (req: Request, context: Context) => japanesePlacementHttp(req, async (actorId) =>
  getTeacherJapaneseResult(prisma, actorId, (await context.params).studentId));
