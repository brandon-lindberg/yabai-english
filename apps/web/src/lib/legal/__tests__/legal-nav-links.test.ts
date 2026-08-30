import { describe, expect, test } from "vitest";
import { legalNavLinksForRole, teacherOnlyLegalPaths } from "@/lib/legal/legal-nav-links";

const hrefs = (role: Parameters<typeof legalNavLinksForRole>[0]) =>
  legalNavLinksForRole(role).map((l) => l.href);

describe("legalNavLinksForRole", () => {
  test("a student is never offered the teacher's documents", () => {
    const links = hrefs("STUDENT");
    expect(links).toEqual([
      "/legal/terms",
      "/legal/terms/students",
      "/legal/refund/students",
      "/legal/privacy",
    ]);
    for (const teacherPath of teacherOnlyLegalPaths) {
      expect(links).not.toContain(teacherPath);
    }
  });

  test("a teacher is not offered the student's documents", () => {
    expect(hrefs("TEACHER")).toEqual([
      "/legal/terms",
      "/legal/terms/teachers",
      "/legal/refund/teachers",
      "/legal/privacy",
    ]);
  });

  test("an admin sees every document", () => {
    expect(hrefs("SUPER_ADMIN")).toHaveLength(6);
  });

  test("a signed-out visitor sees every document, since they may be either", () => {
    expect(hrefs(null)).toHaveLength(6);
  });

  test("every link carries its own label key", () => {
    for (const link of legalNavLinksForRole(null)) {
      expect(link.labelKey).toMatch(/^nav/);
    }
  });
});
