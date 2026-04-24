import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrgWideAdmin,
  isSchoolAdmin,
  meetsMinimumRole,
  type MembershipForAuth,
} from "@/lib/org-authorization";
import { createUserNotification } from "@/lib/notifications";

const updateMemberSchema = z.object({
  orgRole: z.enum(["SCHOOL_ADMIN", "TEACHER", "STUDENT"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

type RouteContext = { params: Promise<{ orgId: string; memberId: string }> };

async function getCallerMembership(
  userId: string,
  orgId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: { userId, organizationId: orgId, status: "ACTIVE" },
    select: {
      id: true, organizationId: true, userId: true,
      schoolId: true, orgRole: true, status: true,
    },
  });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, memberId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId);
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.organizationMembership.findUnique({
    where: { id: memberId },
    select: {
      id: true, organizationId: true, userId: true,
      schoolId: true, orgRole: true, status: true,
    },
  });

  if (!target || target.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cannot modify someone with equal or higher role
  if (meetsMinimumRole(target.orgRole, caller.orgRole)) {
    // Exception: you can modify yourself (e.g., deactivate own membership)
    if (target.userId !== caller.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // School admin can only manage members of their school
  if (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, target.schoolId ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.organizationMembership.update({
    where: { id: memberId },
    data: parsed.data,
  });

  const wasPending = target.status === "PENDING_APPROVAL";
  const becameActive = parsed.data.status === "ACTIVE";
  const becameInactive = parsed.data.status === "INACTIVE";

  if (wasPending && (becameActive || becameInactive)) {
    const school = target.schoolId
      ? await prisma.school.findUnique({
          where: { id: target.schoolId },
          select: { name: true },
        })
      : null;
    const schoolName = school?.name ?? "the school";

    if (becameActive) {
      await createUserNotification({
        userId: target.userId,
        titleJa: "申請が承認されました",
        titleEn: "Application approved",
        bodyJa: `${schoolName}への参加申請が承認されました。`,
        bodyEn: `Your application to join ${schoolName} was approved.`,
      });
    } else {
      await createUserNotification({
        userId: target.userId,
        titleJa: "申請が承認されませんでした",
        titleEn: "Application not approved",
        bodyJa: `${schoolName}への参加申請は承認されませんでした。`,
        bodyEn: `Your application to join ${schoolName} was not approved.`,
      });
    }
  }

  return NextResponse.json({ membership: updated });
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, memberId } = await ctx.params;
  const caller = await getCallerMembership(session.user.id, orgId);
  if (!caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.organizationMembership.findUnique({
    where: { id: memberId },
    select: {
      id: true, organizationId: true, userId: true,
      schoolId: true, orgRole: true, status: true,
    },
  });

  if (!target || target.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cannot remove OWNER
  if (target.orgRole === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the organization owner" }, { status: 403 });
  }

  // Cannot remove someone with equal or higher role (unless self)
  if (meetsMinimumRole(target.orgRole, caller.orgRole) && target.userId !== caller.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // School admin can only remove members of their school
  if (!isOrgWideAdmin(caller) && !isSchoolAdmin(caller, target.schoolId ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.organizationMembership.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
