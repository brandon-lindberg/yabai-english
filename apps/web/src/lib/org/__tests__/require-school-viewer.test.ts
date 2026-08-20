import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ViewerSchoolRole } from "@/lib/org-viewer-role";

/**
 * These pages had the access check written out seven times. What varied was the
 * level and the destination, which is exactly the pair that goes wrong quietly:
 * a page that redirects somewhere harmless still let the query run, and a page
 * copied from the wrong sibling gets the level of that sibling.
 */

const auth = vi.fn();
const getViewerSchoolRole = vi.fn();

vi.mock("@/auth", () => ({ auth: () => auth() }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/org-viewer-role", () => ({
  getViewerSchoolRole: (...args: unknown[]) => getViewerSchoolRole(...args),
}));
vi.mock("@/i18n/navigation", () => ({
  redirect: ({ href }: { href: string }) => {
    // Stands in for NEXT_REDIRECT, which is also thrown rather than returned.
    throw new Error(`REDIRECT:${href}`);
  },
}));

const { requireSchoolViewer } = await import("../require-school-viewer");

const params = Promise.resolve({ orgId: "org-1", schoolId: "school-1" });

function viewer(over: Partial<ViewerSchoolRole> = {}): ViewerSchoolRole {
  return {
    orgRole: "TEACHER",
    isOrgWide: false,
    isSchoolAdmin: false,
    isSchoolTeacher: false,
    isSchoolStudent: false,
    ...over,
  };
}

/** The destination, or `null` when the call was allowed through. */
async function destinationFor(
  access: Parameters<typeof requireSchoolViewer>[1],
): Promise<string | null> {
  try {
    await requireSchoolViewer(params, access);
    return null;
  } catch (e) {
    const message = (e as Error).message;
    if (!message.startsWith("REDIRECT:")) throw e;
    return message.slice("REDIRECT:".length);
  }
}

beforeEach(() => {
  auth.mockReset();
  getViewerSchoolRole.mockReset();
  auth.mockResolvedValue({ user: { id: "user-1" } });
  getViewerSchoolRole.mockResolvedValue(viewer({ isSchoolAdmin: true }));
});

describe("requireSchoolViewer", () => {
  test("a signed-out visitor goes to sign-in, and the viewer is never looked up", async () => {
    auth.mockResolvedValue(null);
    expect(await destinationFor("anyMember")).toBe("/auth/signin");
    expect(getViewerSchoolRole).not.toHaveBeenCalled();
  });

  test("a non-member goes to the org, not to the school page", async () => {
    // Five of the seven pages sent non-members to the school, which the layout
    // then bounced to the org. One hop, and only correct by accident.
    getViewerSchoolRole.mockResolvedValue(null);
    expect(await destinationFor("schoolAdmin")).toBe("/org/org-1");
  });

  test("a member without the level goes to the school they can see", async () => {
    getViewerSchoolRole.mockResolvedValue(viewer({ isSchoolStudent: true }));
    expect(await destinationFor("schoolAdmin")).toBe("/org/org-1/schools/school-1");
  });
});

describe("requireSchoolViewer access levels", () => {
  const cases: Array<{
    who: string;
    role: Partial<ViewerSchoolRole>;
    allowed: Array<Parameters<typeof requireSchoolViewer>[1]>;
  }> = [
    {
      who: "a school admin",
      role: { isSchoolAdmin: true },
      allowed: ["anyMember", "schoolAdmin", "adminOrTeacher"],
    },
    {
      who: "a teacher",
      role: { isSchoolTeacher: true },
      allowed: ["anyMember", "adminOrTeacher"],
    },
    {
      who: "a student",
      role: { isSchoolStudent: true },
      allowed: ["anyMember"],
    },
  ];

  for (const { who, role, allowed } of cases) {
    for (const access of ["anyMember", "schoolAdmin", "adminOrTeacher"] as const) {
      const shouldPass = allowed.includes(access);
      test(`${who} is ${shouldPass ? "allowed" : "refused"} on ${access}`, async () => {
        getViewerSchoolRole.mockResolvedValue(viewer(role));
        expect(await destinationFor(access)).toBe(
          shouldPass ? null : "/org/org-1/schools/school-1",
        );
      });
    }
  }

  test("the resolved viewer is handed back, so pages can branch on it", async () => {
    // The time-off page needs this: admins review, teachers request.
    getViewerSchoolRole.mockResolvedValue(viewer({ isSchoolTeacher: true }));
    const result = await requireSchoolViewer(params, "adminOrTeacher");
    expect(result.viewer.isSchoolTeacher).toBe(true);
    expect(result.viewer.isSchoolAdmin).toBe(false);
    expect(result).toMatchObject({ orgId: "org-1", schoolId: "school-1" });
  });
});
