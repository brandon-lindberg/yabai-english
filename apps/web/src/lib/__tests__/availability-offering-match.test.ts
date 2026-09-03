import { describe, expect, test } from "vitest";
import {
  availabilitySlotMatchesOffering,
  groupSlotRulesViolation,
  offeringCanBackAvailabilitySlot,
} from "@/lib/availability-offering-match";

const offering = {
  classLevelId: "lvl-int",
  classTypeId: "ty-conv",
  durationMin: 60,
};

const slot = {
  classLevelId: "lvl-int",
  classTypeId: "ty-conv",
  startMin: 9 * 60,
  endMin: 10 * 60,
};

describe("offeringCanBackAvailabilitySlot", () => {
  test("accepts an offering carrying both a class level and a class type", () => {
    expect(offeringCanBackAvailabilitySlot(offering)).toBe(true);
  });

  test("rejects an offering missing a class type", () => {
    expect(offeringCanBackAvailabilitySlot({ ...offering, classTypeId: null })).toBe(false);
  });

  test("rejects an offering missing a class level", () => {
    expect(offeringCanBackAvailabilitySlot({ ...offering, classLevelId: null })).toBe(false);
  });
});

describe("availabilitySlotMatchesOffering", () => {
  test("matches on the same class and the same length", () => {
    expect(availabilitySlotMatchesOffering(slot, offering)).toBe(true);
  });

  test("rejects a different class level", () => {
    expect(availabilitySlotMatchesOffering(slot, { ...offering, classLevelId: "lvl-adv" })).toBe(
      false,
    );
  });

  test("rejects a different class type", () => {
    expect(availabilitySlotMatchesOffering(slot, { ...offering, classTypeId: "ty-biz" })).toBe(
      false,
    );
  });

  // The exact shape that blocked saves: a null on the offering read as a
  // wildcard on the client, but the route compares by equality.
  test("rejects a null class type against a slot that carries one", () => {
    expect(availabilitySlotMatchesOffering(slot, { ...offering, classTypeId: null })).toBe(false);
  });

  test("rejects a different duration", () => {
    expect(availabilitySlotMatchesOffering(slot, { ...offering, durationMin: 30 })).toBe(false);
  });

  test("rejects a missing offering", () => {
    expect(availabilitySlotMatchesOffering(slot, undefined)).toBe(false);
  });
});

describe("groupSlotRulesViolation", () => {
  const groupOffering = { isGroup: true, groupSize: 4, isFreeTrial: false };
  const privateOffering = { isGroup: false, groupSize: null, isFreeTrial: false };

  test("accepts a group slot open to everyone", () => {
    expect(groupSlotRulesViolation({ assignedStudentId: null }, groupOffering)).toBe(null);
  });

  test("accepts a slot that omits the field entirely", () => {
    expect(groupSlotRulesViolation({}, groupOffering)).toBe(null);
  });

  // A reservation makes the slot invisible to everyone but that one student,
  // which is the opposite of a class other people are supposed to fill.
  test("rejects a group slot reserved for one student", () => {
    expect(groupSlotRulesViolation({ assignedStudentId: "stu-1" }, groupOffering)).toBe(
      "ASSIGNED_GROUP_SLOT",
    );
  });

  test("leaves a reserved private slot alone", () => {
    expect(groupSlotRulesViolation({ assignedStudentId: "stu-1" }, privateOffering)).toBe(null);
  });

  test("rejects a group offering marked as the free trial", () => {
    expect(
      groupSlotRulesViolation({ assignedStudentId: null }, { ...groupOffering, isFreeTrial: true }),
    ).toBe("GROUP_FREE_TRIAL");
  });

  test("rejects a group offering seating fewer than two", () => {
    expect(
      groupSlotRulesViolation({ assignedStudentId: null }, { ...groupOffering, groupSize: 1 }),
    ).toBe("INVALID_GROUP_SIZE");
  });

  test("rejects a group offering with no capacity set at all", () => {
    expect(
      groupSlotRulesViolation({ assignedStudentId: null }, { ...groupOffering, groupSize: null }),
    ).toBe("INVALID_GROUP_SIZE");
  });

  test("has nothing to say about a missing offering", () => {
    // availabilitySlotMatchesOffering already refuses that payload; saying it
    // twice would just give the teacher the wrong reason.
    expect(groupSlotRulesViolation({ assignedStudentId: null }, undefined)).toBe(null);
  });
});
