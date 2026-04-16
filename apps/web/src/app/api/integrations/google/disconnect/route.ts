import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  feature: z.enum(["calendar", "drive", "meet", "all"]).default("all"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data =
    parsed.data.feature === "all"
      ? {
          calendarConnected: false,
          driveConnected: false,
          meetConnected: false,
          artifactSyncEnabled: false,
        }
      : parsed.data.feature === "calendar"
        ? { calendarConnected: false }
        : parsed.data.feature === "drive"
          ? { driveConnected: false }
          : { meetConnected: false, artifactSyncEnabled: false };

  await prisma.googleIntegrationSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...data,
    },
    update: data,
  });

  if (parsed.data.feature === "all") {
    await prisma.googleIntegrationAccount.updateMany({
      where: { userId: session.user.id },
      data: {
        revoked: true,
        disconnectedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
