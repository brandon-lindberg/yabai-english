import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  canRequestTimeOff,
  type MembershipForAuth,
} from "@/lib/org-authorization";
import { validateTimeOffRequest } from "@/lib/school-time-off";
import { notifySchoolAdmins } from "@/lib/school-admin-notify";

const createTimeOffSchema = z.object({
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  reason: z.string().trim().max(1000).optional(),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string }>;
};

async function getCallerMembership(
  userId: string,
  orgId: string,
  schoolId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId: orgId,
      status: "ACTIVE",
      OR: [{ schoolId: null }, { schoolId }],
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      schoolId: true,
      orgRole: true,
      status: true,
    },
    orderBy: { orgRole: "asc" },
  });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);

  if (!caller || !canRequestTimeOff(caller)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTimeOffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { startDate, endDate, reason } = parsed.data;

  const validation = validateTimeOffRequest({ startDate, endDate }, new Date());
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const request = await prisma.timeOffRequest.create({
    data: {
      schoolId,
      teacherMembershipId: caller.id,
      startDate,
      endDate,
      reason,
    },
  });

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  });
  const teacherName =
    session.user.name ?? session.user.email ?? "A teacher";
  const schoolName = school?.name ?? "the school";
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  await notifySchoolAdmins({
    organizationId: orgId,
    schoolId,
    excludeUserId: session.user.id,
    titleJa: "新しい休暇申請",
    titleEn: "New time-off request",
    bodyJa: `${teacherName}さん（${schoolName}）が${fmt(startDate)}〜${fmt(endDate)}の休暇を申請しました。`,
    bodyEn: `${teacherName} at ${schoolName} requested time off ${fmt(startDate)} – ${fmt(endDate)}.`,
  });

  return NextResponse.json({ request }, { status: 201 });
}

export async function GET(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId, schoolId);

  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isAdmin = isOrgWideAdmin(caller) || isSchoolAdmin(caller, schoolId);
  const isTeacher = caller.orgRole === "TEACHER";

  if (!isAdmin && !isTeacher) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") ?? undefined;

  const where = {
    schoolId,
    // Teachers only see their own requests
    ...(isTeacher && !isAdmin ? { teacherMembershipId: caller.id } : {}),
    ...(statusFilter ? { status: statusFilter as "PENDING" | "APPROVED" | "DENIED" } : {}),
  };

  const requests = await prisma.timeOffRequest.findMany({
    where,
    include: {
      teacherMembership: {
        select: {
          id: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}
