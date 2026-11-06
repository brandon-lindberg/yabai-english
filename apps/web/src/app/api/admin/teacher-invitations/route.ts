import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestLearningSite } from "@/lib/learning-site-request";
import { configuredLearningSites, publicAppOrigin } from "@/lib/learning-sites";
import { PrivateApiFailure } from "@/lib/private-api-error";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { createTeacherInvitation, revokeTeacherInvitation } from "@/lib/teacher-invitations";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;
  const site = await getRequestLearningSite();
  const sites = configuredLearningSites();
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ja";
  try {
    const { token, ...invite } = await createTeacherInvitation(prisma, session.user.id, await request.json().catch(() => null));
    const subject = site?.learningLanguage && invite.teachingLanguages.includes(site.learningLanguage)
      ? site.learningLanguage : invite.teachingLanguages[0];
    // The explicit locale lets a new visitor open the invitation in its chosen language.
    const link = new URL(`/${locale}/teacher-invite`, sites?.[subject].origin ?? publicAppOrigin());
    link.hash = token;
    return NextResponse.json({ ...invite, link: link.href }, { status: 201, headers: noStore });
  } catch (cause) {
    if (cause instanceof PrivateApiFailure) return NextResponse.json({ error: cause.code }, { status: cause.status, headers: noStore });
    throw cause;
  }
}

export async function PATCH(request: Request) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;
  const parsed = z.object({ id: z.string().min(1).max(100) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INVITATION" }, { status: 400, headers: noStore });
  try {
    const revoked = await revokeTeacherInvitation(prisma, session.user.id, parsed.data.id);
    return NextResponse.json({ revoked }, { headers: noStore });
  } catch (cause) {
    if (cause instanceof PrivateApiFailure) return NextResponse.json({ error: cause.code }, { status: cause.status, headers: noStore });
    throw cause;
  }
}
