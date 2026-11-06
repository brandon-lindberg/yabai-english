import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { lockAdminAccountChanges } from "@/lib/admin/account-access";
import { provisionRoleProfile } from "@/lib/admin/provision-role-profile";
import { invalidateUserSessions } from "@/lib/admin-invalidate-sessions";
import { teachingLanguagesSchema } from "@/lib/learning-language";
import { PrivateApiFailure } from "@/lib/private-api-error";
import { lockTransaction } from "@/lib/transaction-lock";

const lifetime = 7 * 24 * 60 * 60 * 1000;
export const teacherInvitationToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const teacherInvitationCookieName = (secure: boolean) => `${secure ? "__Host-" : ""}teacher-invitation`;
const invitationInput = z.object({ label: z.string().trim().max(80).optional(), teachingLanguages: teachingLanguagesSchema }).strict();
const inviteSummary = { id: true, label: true, teachingLanguages: true, expiresAt: true } as const;
const pendingWhere = (now: Date) => ({ expiresAt: { gt: now }, revokedAt: null, redeemedAt: null });
const tokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");

export async function createTeacherInvitation(db: PrismaClient, actorId: string, input: unknown) {
  const parsed = invitationInput.safeParse(input);
  if (!parsed.success) throw new PrivateApiFailure(400, "INVALID_INVITATION");
  const token = randomBytes(32).toString("base64url");
  const invite = await db.$transaction(async (tx) => {
    await lockAdminAccountChanges(tx, actorId);
    const now = new Date();
    return tx.teacherInvitation.create({
      data: { ...parsed.data, label: parsed.data.label || null, createdById: actorId,
        tokenHash: tokenHash(token), createdAt: now, expiresAt: new Date(now.getTime() + lifetime) },
      select: inviteSummary,
    });
  });
  return { ...invite, token };
}

export function listPendingTeacherInvitations(db: PrismaClient) {
  return db.teacherInvitation.findMany({ where: pendingWhere(new Date()), orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: inviteSummary });
}

export async function revokeTeacherInvitation(db: PrismaClient, actorId: string, id: string) {
  return db.$transaction(async (tx) => {
    await lockAdminAccountChanges(tx, actorId);
    const now = new Date();
    const { count } = await tx.teacherInvitation.updateMany({ where: { id, ...pendingWhere(now) }, data: { revokedAt: now } });
    return count === 1;
  });
}

export async function teacherInvitationIsPending(db: PrismaClient, token: string) {
  return teacherInvitationToken.safeParse(token).success &&
    Boolean(await db.teacherInvitation.findUnique({ where: { tokenHash: tokenHash(token), ...pendingWhere(new Date()) }, select: { id: true } }));
}

export async function redeemTeacherInvitation(db: PrismaClient, token: string, userId: string, sessionToken: string) {
  if (!teacherInvitationToken.safeParse(token).success) return "unavailable";
  try {
    return await db.$transaction(async (tx) => {
      const digest = tokenHash(token);
      await lockTransaction(tx, "teacher-invitation", digest);
      const now = new Date();
      const invite = await tx.teacherInvitation.findUnique({ where: { tokenHash: digest, ...pendingWhere(now) }, select: inviteSummary });
      if (!invite) return "unavailable";
      const claimed = await tx.teacherInvitation.updateMany({
        where: { id: invite.id, ...pendingWhere(now) }, data: { redeemedAt: now, redeemedById: userId },
      });
      if (!claimed.count) return "unavailable";

      const promoted = await tx.user.updateMany({ where: {
        id: userId, role: "STUDENT", accountStatus: "ACTIVE", teacherProfile: null,
        accounts: { some: { provider: "google" } },
        sessions: { some: { sessionToken, expires: { gt: now } } },
      }, data: { role: "TEACHER" } });
      if (!promoted.count) throw new PrivateApiFailure(409, "INVITATION_ACCOUNT_INELIGIBLE");
      await provisionRoleProfile(tx, { userId, role: "TEACHER", teachingLanguages: invite.teachingLanguages });
      await invalidateUserSessions(tx, userId, sessionToken);
      return "accepted";
    });
  } catch (error) {
    if (error instanceof PrivateApiFailure && error.code === "INVITATION_ACCOUNT_INELIGIBLE") return "ineligible";
    throw error;
  }
}
