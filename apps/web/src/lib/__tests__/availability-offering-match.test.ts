import { describe, expect, test } from "vitest";
import {
  availabilitySlotMatchesOffering,
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
