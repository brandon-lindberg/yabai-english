import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { lockAdminAccountChanges } from "@/lib/admin/account-access";
import { provisionRoleProfile } from "@/lib/admin/provision-role-profile";
import { invalidateUserSessions } from "@/lib/admin-invalidate-sessions";
import { teachingLanguagesSchema } from "@/lib/learning-language";
import { PrivateApiFailure } from "@/lib/private-api-error";
import { lockTransaction } from "@/lib/transaction-lock";

const lifetime = 7 * 24 * 60 * 60 * 1000;
export const teacherInvitationPath = "/teacher-invite";
export const teacherInvitationOAuthSeconds = 15 * 60;
const teacherInvitationToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const teacherInvitationCookieName = (secure: boolean) => `${secure ? "__Host-" : ""}teacher-invitation`;
const invitationFields = { label: z.string().trim().max(80).optional(), teachingLanguages: teachingLanguagesSchema };
const invitationInput = z.discriminatedUnion("mode", [
  z.object({ ...invitationFields, mode: z.literal("email"), recipientEmail: z.string().trim().max(254).email().toLowerCase() }).strict(),
  z.object({ ...invitationFields, mode: z.literal("open") }).strict(),
]);
const inviteSummary = { id: true, label: true, recipientEmail: true, teachingLanguages: true, expiresAt: true } as const;
const pendingWhere = (now: Date) => ({ expiresAt: { gt: now }, revokedAt: null, redeemedAt: null });
const tokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");
const proofPrefix = "teacher-invitation-email:";
type InvitationContext = { token: string; attempt?: string };
type EmailBinding = { id: string; recipientEmail: string | null };

export function parseTeacherInvitationCookie(value = ""): InvitationContext | null {
  const [token, attempt, extra] = value.split(".");
  if (extra !== undefined || !teacherInvitationToken.safeParse(token).success ||
    (attempt !== undefined && !teacherInvitationToken.safeParse(attempt).success)) return null;
  return { token, attempt };
}

export function pendingTeacherInvitation(db: PrismaClient | Prisma.TransactionClient, token: string, now = new Date()) {
  if (!teacherInvitationToken.safeParse(token).success) return Promise.resolve(null);
  return db.teacherInvitation.findUnique({ where: { tokenHash: tokenHash(token), ...pendingWhere(now) }, select: inviteSummary });
}

function proofKey(invitation: EmailBinding, userId: string, attempt: string) {
  return { identifier: `${proofPrefix}${invitation.id}`, token: tokenHash(JSON.stringify([invitation.id, invitation.recipientEmail, userId, attempt])) };
}

async function hasEmailProof(db: PrismaClient | Prisma.TransactionClient, invitation: EmailBinding, userId: string, attempt: string | undefined, now: Date) {
  if (!teacherInvitationToken.safeParse(attempt).success || !attempt) return false;
  return Boolean(await db.verificationToken.findUnique({
    where: { ...proofKey(invitation, userId, attempt), expires: { gt: now } }, select: { token: true },
  }));
}

export async function teacherInvitationHasGoogleProof(db: PrismaClient, context: InvitationContext, userId: string) {
  const now = new Date();
  const invitation = await pendingTeacherInvitation(db, context.token, now);
  return Boolean(invitation?.recipientEmail && await hasEmailProof(db, invitation, userId, context.attempt, now));
}

/** Called only after Auth.js finishes a Google sign-in and resolves the user ID. */
export async function recordTeacherInvitationGoogleEmail(db: PrismaClient, context: InvitationContext, userId: string, profile?: {
  email?: string | null;
  email_verified?: unknown;
}) {
  const { attempt } = context;
  if (!attempt || !teacherInvitationToken.safeParse(attempt).success || profile?.email_verified !== true || !profile.email) return;
  const now = new Date();
  const invitation = await pendingTeacherInvitation(db, context.token, now);
  if (invitation?.recipientEmail !== profile.email.trim().toLowerCase()) return;
  const key = proofKey(invitation, userId, attempt);
  const expires = new Date(Math.min(invitation.expiresAt.getTime(), now.getTime() + teacherInvitationOAuthSeconds * 1000));
  await db.verificationToken.deleteMany({ where: { identifier: { startsWith: proofPrefix }, expires: { lte: now } } });
  await db.verificationToken.upsert({ where: { token: key.token }, create: { ...key, expires }, update: { expires } });
}

export async function createTeacherInvitation(db: PrismaClient, actorId: string, input: unknown) {
  const parsed = invitationInput.safeParse(input);
  if (!parsed.success) throw new PrivateApiFailure(400, "INVALID_INVITATION");
  const token = randomBytes(32).toString("base64url");
  const { mode, label, teachingLanguages } = parsed.data;
  const invite = await db.$transaction(async (tx) => {
    await lockAdminAccountChanges(tx, actorId);
    const now = new Date();
    return tx.teacherInvitation.create({
      data: { label: label || null, teachingLanguages, recipientEmail: mode === "email" ? parsed.data.recipientEmail : null, createdById: actorId,
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

export async function redeemTeacherInvitation(db: PrismaClient, token: string, userId: string, sessionToken: string, attempt?: string) {
  if (!teacherInvitationToken.safeParse(token).success) return "unavailable";
  try {
    return await db.$transaction(async (tx) => {
      const digest = tokenHash(token);
      await lockTransaction(tx, "teacher-invitation", digest);
      const now = new Date();
      const invite = await pendingTeacherInvitation(tx, token, now);
      if (!invite) return "unavailable";
      if (invite.recipientEmail && !await hasEmailProof(tx, invite, userId, attempt, now)) return "verify-email";
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
