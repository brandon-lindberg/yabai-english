import type { PrismaClient } from "@/generated/prisma/client";

export function normalizeRosterInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface ClaimTeacherRosterInvitesResult {
  claimed: number;
}

/**
 * Links pending roster invites (invitedEmail, no studentId) to the student user
 * after sign-in when their email matches (case-insensitive).
 */
export async function claimTeacherRosterInvites(
  prisma: Pick<PrismaClient, "teacherRosterEntry">,
  args: { userId: string; email: string | null | undefined },
): Promise<ClaimTeacherRosterInvitesResult> {
  const raw = args.email?.trim();
  if (!raw || !args.userId) return { claimed: 0 };
  const normalized = normalizeRosterInviteEmail(raw);

  const result = await prisma.teacherRosterEntry.updateMany({
    where: {
      studentId: null,
      invitedEmail: { equals: normalized, mode: "insensitive" },
    },
    data: {
      studentId: args.userId,
      invitedEmail: null,
    },
  });

  return { claimed: result.count };
}
