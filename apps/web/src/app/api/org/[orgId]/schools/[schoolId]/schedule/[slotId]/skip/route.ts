import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
} from "@/lib/org-authorization";
import { getSchoolCallerMembership } from "@/lib/org/caller-membership";

const skipSchema = z.object({
  startsAtIso: z.string().min(1),
  reason: z.string().trim().max(1000).optional(),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string; slotId: string }>;
};

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId, slotId } = await ctx.params;
  const caller = await getSchoolCallerMembership(session.user.id, orgId, schoolId);

  if (!caller || (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slot = await prisma.schoolScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = skipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Check for duplicate skip
  const existing = await prisma.schoolScheduleSkip.findUnique({
    where: {
      scheduleSlotId_startsAtIso: {
        scheduleSlotId: slotId,
        startsAtIso: parsed.data.startsAtIso,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This occurrence is already skipped" },
      { status: 409 },
    );
  }

  const skip = await prisma.schoolScheduleSkip.create({
    data: {
      scheduleSlotId: slotId,
      startsAtIso: parsed.data.startsAtIso,
      reason: parsed.data.reason,
      createdByUserId: session.user.id,
    },
  });

  return NextResponse.json({ skip }, { status: 201 });
}
