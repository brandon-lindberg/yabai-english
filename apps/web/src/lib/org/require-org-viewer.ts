import { cache } from "react";
import { getLocale } from "next-intl/server";
import type { OrgRole } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { isOrgWideRole } from "@/lib/org-authorization";

/**
 * The org-page preamble, and the org-level twin of `requireSchoolViewer`.
 *
 * The four org pages checked only that *someone* was signed in. Membership of
 * the organization named in the URL was never established: any signed-in user
 * could open `/org/<any-id>/settings` and get the page frame, with the APIs
 * behind it the only thing actually refusing them. That is one layer where the
 * school routes have two, and it is the layer a person sees.
 *
 * Cached per request so a layout and its page share one query.
 */
export type OrgViewer = {
  orgRole: OrgRole;
  /** OWNER or ORG_ADMIN — may manage the org itself, not just one school. */
  isOrgWide: boolean;
};

const loadOrgViewer = cache(
  async (userId: string, orgId: string): Promise<OrgViewer | null> => {
    const membership = await prisma.organizationMembership.findFirst({
      where: { userId, organizationId: orgId, status: "ACTIVE" },
      select: { orgRole: true },
    });
    if (!membership) return null;
    return {
      orgRole: membership.orgRole,
      isOrgWide: isOrgWideRole(membership.orgRole),
    };
  },
);

type Locale = Awaited<ReturnType<typeof getLocale>>;

/** See the note in `require-school-viewer.ts`: `redirect` throws but is not typed `never`. */
function redirectAway(href: string, locale: Locale): never {
  redirect({ href, locale });
  throw new Error(`redirect to ${href} did not halt rendering`);
}

export async function requireOrgViewer(
  params: Promise<{ orgId: string }>,
  options: { orgWideOnly?: boolean } = {},
): Promise<{ orgId: string; viewer: OrgViewer }> {
  const { orgId } = await params;
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user?.id) {
    redirectAway("/auth/signin", locale);
  }

  const viewer = await loadOrgViewer(session.user.id, orgId);
  if (!viewer) {
    redirectAway("/dashboard", locale);
  }

  if (options.orgWideOnly && !viewer.isOrgWide) {
    redirectAway(`/org/${orgId}`, locale);
  }

  return { orgId, viewer };
}
