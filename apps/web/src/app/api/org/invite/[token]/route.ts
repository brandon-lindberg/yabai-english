import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createUserNotification } from "@/lib/notifications";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const { token } = await ctx.params;

  const membership = await prisma.organizationMembership.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      status: true,
      orgRole: true,
      inviteExpiresAt: true,
      inviteEmail: true,
      organization: { select: { id: true, name: true, slug: true } },
      school: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
  }

  if (membership.status !== "INVITED") {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }

  if (membership.inviteExpiresAt && membership.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  return NextResponse.json({
    invite: {
      orgRole: membership.orgRole,
      email: membership.inviteEmail,
      organization: membership.organization,
      school: membership.school,
    },
  });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await ctx.params;

  const membership = await prisma.organizationMembership.findUnique({
    where: { inviteToken: token },
    select: {
      id: true, status: true, userId: true, inviteExpiresAt: true,
      inviteEmail: true, organizationId: true, schoolId: true, orgRole: true,
      invitedByUserId: true,
      organization: { select: { name: true } },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
  }

  if (membership.status !== "INVITED") {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }

  if (membership.inviteExpiresAt && membership.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  // If the invite was created with a placeholder userId (inviter's ID),
  // update it to the actual accepting user
  const updated = await prisma.organizationMembership.update({
    where: { id: membership.id },
    data: {
      userId: session.user.id,
      status: "ACTIVE",
      joinedAt: new Date(),
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });

  if (membership.invitedByUserId && membership.invitedByUserId !== session.user.id) {
    const acceptorName = session.user.name ?? session.user.email ?? "A user";
    const orgName = membership.organization?.name ?? "your organization";
    await createUserNotification({
      userId: membership.invitedByUserId,
      titleJa: "招待が承諾されました",
      titleEn: "Invitation accepted",
      bodyJa: `${acceptorName}さんが${orgName}への招待を承諾しました。`,
      bodyEn: `${acceptorName} accepted your invite to ${orgName}.`,
    });
  }

  return NextResponse.json({ membership: updated });
}
