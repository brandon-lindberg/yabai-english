import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Disconnecting Google is one action too.
 *
 * There is no `feature` any more. Partial disconnection could not revoke the
 * underlying grant — it only flipped a boolean while the token stayed live —
 * so "disconnect Calendar" left the app holding credentials it claimed not to
 * have. Disconnect now clears every capability and marks the account revoked,
 * which is what the word means.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cleared = {
    calendarConnected: false,
    driveConnected: false,
    meetConnected: false,
    artifactSyncEnabled: false,
  };

  await prisma.googleIntegrationSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...cleared },
    update: cleared,
  });

  await prisma.googleIntegrationAccount.updateMany({
    where: { userId: session.user.id },
    data: {
      revoked: true,
      disconnectedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
