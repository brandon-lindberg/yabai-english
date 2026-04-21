import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  type MembershipForAuth,
} from "@/lib/org-authorization";
import { validateTimeOffReview } from "@/lib/school-time-off";
import { createUserNotification } from "@/lib/notifications";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "DENIED"]),
  reviewNote: z.string().trim().max(1000).optional(),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string; requestId: string }>;
};

async function getCallerMembership(
  userId: string,
  orgId: string,
  schoolId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: {
      userId, organizationId: orgId, status: "ACTIVE",
      OR: [{ schoolId: null }, { schoolId }],
    },
    select: {
      id: true, organizationId: true, userId: true,
      schoolId: true, orgRole: true, status: true,
    },
    orderBy: { orgRole: "asc" },
  });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId, requestId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);

  if (!caller || (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, schoolId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const timeOffRequest = await prisma.timeOffRequest.findUnique({
    where: { id: requestId },
    include: {
      teacherMembership: { select: { userId: true } },
      school: { select: { name: true } },
    },
  });

  if (!timeOffRequest || timeOffRequest.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const validation = validateTimeOffReview(timeOffRequest.status, parsed.data.status);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const updated = await prisma.timeOffRequest.update({
    where: { id: requestId },
    data: {
      status: parsed.data.status,
      reviewNote: parsed.data.reviewNote,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
    },
  });

  const teacherUserId = timeOffRequest.teacherMembership?.userId;
  if (teacherUserId) {
    const approved = parsed.data.status === "APPROVED";
    const schoolName = timeOffRequest.school?.name ?? "";
    await createUserNotification({
      userId: teacherUserId,
      titleJa: approved ? "休暇申請が承認されました" : "休暇申請が却下されました",
      titleEn: approved ? "Time-off request approved" : "Time-off request denied",
      bodyJa: schoolName ? `${schoolName}からの通知です。` : undefined,
      bodyEn: schoolName ? `From ${schoolName}.` : undefined,
    });
  }

  return NextResponse.json({ request: updated });
}
