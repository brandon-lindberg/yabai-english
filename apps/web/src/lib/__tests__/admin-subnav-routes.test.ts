import { describe, expect, test } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import { ADMIN_SUBNAV_ROUTES, adminNavIsCurrent } from "@/lib/admin-subnav-routes";

describe("admin navigation", () => {
  test.each([en, ja])("every section has a localized label", ({ admin }) => {
    for (const [, labelKey] of ADMIN_SUBNAV_ROUTES) {
      expect(admin.nav[labelKey]).toBeTruthy();
    }
  });

  test.each(["/admin/users/user-1", "/admin/invite", "/admin/teacher-tiers"])("keeps %s in People", (route) => {
    expect(ADMIN_SUBNAV_ROUTES.filter(([href]) => adminNavIsCurrent(route, href)).map(([href]) => href)).toEqual(["/admin/users"]);
  });
});
