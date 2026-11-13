import { prisma } from "@/lib/prisma";
import { changeAdminAccountAccess } from "@/lib/admin/account-access";
import { authenticatedPrivateApi, readPrivateApiJson } from "@/lib/private-api";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  return authenticatedPrivateApi(req, async (actorId) => {
    const { userId } = await params;
    return changeAdminAccountAccess(prisma, actorId, userId, await readPrivateApiJson(req));
  });
}
