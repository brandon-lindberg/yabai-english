import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [account, settings] = await Promise.all([
    prisma.googleIntegrationAccount.findUnique({
      where: { userId: session.user.id },
      select: {
        provider: true,
        providerAccountId: true,
        grantedScopes: true,
        revoked: true,
        disconnectedAt: true,
        lastSyncedAt: true,
      },
    }),
    prisma.googleIntegrationSettings.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  return NextResponse.json({
    account,
    settings,
  });
}
