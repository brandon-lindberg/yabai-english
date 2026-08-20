import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getViewerSchoolRole, type ViewerSchoolRole } from "@/lib/org-viewer-role";

/**
 * The school-page preamble: signed in, a member of this school, and — for most
 * pages — an admin of it.
 *
 * Seven pages and the layout each opened with the same fifteen lines: `auth()`
 * → sign-in, resolve the viewer → redirect, then a level check → redirect. Only
 * two things varied, and one of them is the access level, which is exactly the
 * kind of difference that should be declared rather than hand-written.
 *
 * This is the page-side twin of `requireSchoolAccess`, which does the same job
 * for API routes. They stay separate because the outcomes genuinely differ — a
 * page redirects a person, a route returns a status to a caller — but the
 * vocabulary is deliberately the same, so a page and its route cannot describe
 * the same permission in two different ways.
 */
export type SchoolPageAccess =
  /** Any active membership covering this school. */
  | "anyMember"
  /** OWNER, ORG_ADMIN, or SCHOOL_ADMIN of this school. */
  | "schoolAdmin"
  /** School admins, plus teachers assigned to the school. */
  | "adminOrTeacher";

function permits(viewer: ViewerSchoolRole, access: SchoolPageAccess): boolean {
  if (access === "anyMember") return true;
  if (access === "schoolAdmin") return viewer.isSchoolAdmin;
  return viewer.isSchoolAdmin || viewer.isSchoolTeacher;
}

type Locale = Awaited<ReturnType<typeof getLocale>>;

/**
 * `redirect` throws `NEXT_REDIRECT` at runtime, but it is not typed `never`, so
 * on its own the compiler happily carries a null session past the guard. The
 * pages worked around this by writing `return null` after every redirect.
 *
 * The throw below is unreachable. It is here so that if that ever stops being
 * true, the caller fails loudly rather than continuing to render a page for
 * someone who should not see it.
 */
function redirectAway(href: string, locale: Locale): never {
  redirect({ href, locale });
  throw new Error(`redirect to ${href} did not halt rendering`);
}

export async function requireSchoolViewer(
  params: Promise<{ orgId: string; schoolId: string }>,
  access: SchoolPageAccess,
): Promise<{ orgId: string; schoolId: string; viewer: ViewerSchoolRole }> {
  const { orgId, schoolId } = await params;
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user?.id) {
    redirectAway("/auth/signin", locale);
  }

  const viewer = await getViewerSchoolRole(session.user.id, orgId, schoolId);

  /*
    Two different destinations, because they are two different situations. A
    non-member has no business on any page of this school, so they go to the org;
    a member who lacks the level for *this* page goes to the school's own home,
    which they can see. Five of the seven pages sent non-members to the school
    page as well, which the layout then bounced to the org — a wasted hop that
    only worked because the layout happened to repeat the check.
  */
  if (!viewer) {
    redirectAway(`/org/${orgId}`, locale);
  }

  if (!permits(viewer, access)) {
    redirectAway(`/org/${orgId}/schools/${schoolId}`, locale);
  }

  return { orgId, schoolId, viewer };
}
