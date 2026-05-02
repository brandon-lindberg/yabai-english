import type { PrismaClient } from "@/generated/prisma/client";

export interface ClaimResult {
  claimed: number;
}

/**
 * Activates any INVITED OrganizationMembership rows that belong to the
 * signed-in user. A row matches when either:
 *   - it is already linked to this userId (admin pre-linked an existing user), or
 *   - its inviteEmail matches the user's email (case-insensitive) and userId IS NULL.
 *
 * Called from the auth signIn callback so that admin-created invites are
 * claimed automatically the first time the invitee signs in.
 */
export async function claimPendingMemberships(
  prisma: Pick<PrismaClient, "organizationMembership">,
  args: { userId: string; email: string | null | undefined },
): Promise<ClaimResult> {
  const email = args.email?.trim();
  if (!args.userId) return { claimed: 0 };

  const branches: Array<Record<string, unknown>> = [
    { userId: args.userId },
  ];
  if (email) {
    branches.push({
      userId: null,
      inviteEmail: { equals: email, mode: "insensitive" },
    });
  }

  const pending = await prisma.organizationMembership.findMany({
    where: { status: "INVITED", OR: branches },
    select: { id: true },
  });

  if (pending.length === 0) return { claimed: 0 };

  const result = await prisma.organizationMembership.updateMany({
    where: {
      status: "INVITED",
      id: { in: pending.map((p) => p.id) },
    },
    data: {
      userId: args.userId,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  return { claimed: result.count };
}
