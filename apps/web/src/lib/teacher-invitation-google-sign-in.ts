import "server-only";
import { cookies } from "next/headers";
import type { Profile } from "next-auth";
import { stripOptionalLocalePrefix } from "@/lib/auth-callback-url";
import { prisma } from "@/lib/prisma";
import { parseTeacherInvitationCookie, recordTeacherInvitationGoogleEmail, teacherInvitationCookieName, teacherInvitationPath } from "@/lib/teacher-invitations";

export async function recordTeacherInvitationGoogleSignIn(userId: string, profile?: Profile) {
  if (profile?.email_verified !== true) return;
  const store = await cookies();
  const secureCallback = store.get("__Secure-authjs.callback-url")?.value;
  const callback = secureCallback ?? store.get("authjs.callback-url")?.value;
  if (!callback) return;
  let destination: URL;
  try { destination = new URL(callback, "http://localhost"); } catch { return; }
  if (stripOptionalLocalePrefix(destination.pathname) !== teacherInvitationPath || destination.searchParams.get("mode") !== "email") return;
  const context = parseTeacherInvitationCookie(store.get(teacherInvitationCookieName(Boolean(secureCallback)))?.value);
  if (context?.attempt) await recordTeacherInvitationGoogleEmail(prisma, context, userId, profile);
}
