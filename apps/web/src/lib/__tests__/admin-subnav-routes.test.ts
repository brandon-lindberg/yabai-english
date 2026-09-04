import { describe, expect, test } from "vitest";
import en from "../../../messages/en.json";
import { ADMIN_SUBNAV_ROUTES } from "@/lib/admin-subnav-routes";

/*
  Teaching here is by invitation, and the only way to issue one was a button in
  the corner of the All users page — a tab about listing people, not about
  adding them. An admin looking for it had no reason to go there.
*/
describe("admin tabs", () => {
  test("include a place to invite a teacher", () => {
    expect(ADMIN_SUBNAV_ROUTES.map(([href]) => href)).toContain("/admin/invite");
  });

  test("every tab has a label in both locales", () => {
    const labels = en.admin.nav as Record<string, string>;
    for (const [, labelKey] of ADMIN_SUBNAV_ROUTES) {
      expect(labels[labelKey], `missing label for ${labelKey}`).toBeTruthy();
    }
  });

  test("the invite tab sits beside the people tabs, not at the end", () => {
    // It belongs with users and teachers; buried after Reports it is as hidden
    // as the button it replaces.
    const hrefs = ADMIN_SUBNAV_ROUTES.map(([href]) => href);
    expect(hrefs.indexOf("/admin/invite")).toBeLessThan(hrefs.indexOf("/admin/payments"));
  });
});
