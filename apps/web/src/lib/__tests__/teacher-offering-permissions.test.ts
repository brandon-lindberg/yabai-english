import { describe, expect, test } from "vitest";
import {
  isTeacherEditableOffering,
  partitionOfferingsByTeacherEditable,
} from "@/lib/teacher-offering-permissions";

const own = { id: "o1", isFreeTrial: false, adminRateOverrideByUserId: null };
const trial = { id: "o2", isFreeTrial: true, adminRateOverrideByUserId: null };
const adminGranted = { id: "o3", isFreeTrial: false, adminRateOverrideByUserId: "admin-1" };

describe("isTeacherEditableOffering", () => {
  test("a teacher's own priced class is theirs to edit", () => {
    expect(isTeacherEditableOffering(own)).toBe(true);
  });

  // The trial is provisioned for them at a fixed 0 yen; showing it in the rate
  // editor invites them to price something that is by definition free.
  test("the free trial is not theirs to edit", () => {
    expect(isTeacherEditableOffering(trial)).toBe(false);
  });

  // A below-minimum rate is a concession the platform grants. The teacher may
  // teach it, but must not be able to mint one.
  test("an admin-granted below-minimum class is not theirs to edit", () => {
    expect(isTeacherEditableOffering(adminGranted)).toBe(false);
  });

  test("tolerates a record that predates either flag", () => {
    expect(isTeacherEditableOffering({})).toBe(true);
  });
});

describe("partitionOfferingsByTeacherEditable", () => {
  test("separates what a teacher may rewrite from what must survive their save", () => {
    const { editable, preserved } = partitionOfferingsByTeacherEditable([
      own,
      trial,
      adminGranted,
    ]);

    expect(editable.map((o) => o.id)).toEqual(["o1"]);
    expect(preserved.map((o) => o.id)).toEqual(["o2", "o3"]);
  });

  test("an empty list partitions into two empty lists", () => {
    expect(partitionOfferingsByTeacherEditable([])).toEqual({ editable: [], preserved: [] });
  });
});
