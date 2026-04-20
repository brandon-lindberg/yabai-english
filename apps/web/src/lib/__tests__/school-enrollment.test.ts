import { describe, it, expect } from "vitest";
import {
  canEnrollStudent,
  canApplyToSchool,
  validateApplicationTransition,
} from "../school-enrollment";

describe("school-enrollment", () => {
  describe("canEnrollStudent", () => {
    it("allows enrollment when under capacity", () => {
      const result = canEnrollStudent({
        enrolledCount: 3,
        capacity: 5,
        studentMembershipStatus: "ACTIVE",
        isAlreadyEnrolled: false,
      });
      expect(result.allowed).toBe(true);
    });

    it("denies enrollment when at capacity", () => {
      const result = canEnrollStudent({
        enrolledCount: 5,
        capacity: 5,
        studentMembershipStatus: "ACTIVE",
        isAlreadyEnrolled: false,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("full");
    });

    it("denies enrollment for inactive membership", () => {
      const result = canEnrollStudent({
        enrolledCount: 0,
        capacity: 5,
        studentMembershipStatus: "INACTIVE",
        isAlreadyEnrolled: false,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("active");
    });

    it("denies enrollment for invited (not yet accepted) membership", () => {
      const result = canEnrollStudent({
        enrolledCount: 0,
        capacity: 5,
        studentMembershipStatus: "INVITED",
        isAlreadyEnrolled: false,
      });
      expect(result.allowed).toBe(false);
    });

    it("denies enrollment when already enrolled", () => {
      const result = canEnrollStudent({
        enrolledCount: 3,
        capacity: 5,
        studentMembershipStatus: "ACTIVE",
        isAlreadyEnrolled: true,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("already");
    });
  });

  describe("canApplyToSchool", () => {
    it("allows application when flow is enabled and user has no membership", () => {
      const result = canApplyToSchool({
        applicationFlowEnabled: true,
        existingMembershipStatus: null,
      });
      expect(result.allowed).toBe(true);
    });

    it("denies application when flow is disabled", () => {
      const result = canApplyToSchool({
        applicationFlowEnabled: false,
        existingMembershipStatus: null,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not accepting");
    });

    it("denies application when user already has active membership", () => {
      const result = canApplyToSchool({
        applicationFlowEnabled: true,
        existingMembershipStatus: "ACTIVE",
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("already");
    });

    it("denies application when user has pending application", () => {
      const result = canApplyToSchool({
        applicationFlowEnabled: true,
        existingMembershipStatus: "PENDING_APPROVAL",
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("pending");
    });

    it("allows re-application for inactive (previously denied) membership", () => {
      const result = canApplyToSchool({
        applicationFlowEnabled: true,
        existingMembershipStatus: "INACTIVE",
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("validateApplicationTransition", () => {
    it("allows PENDING_APPROVAL → ACTIVE (approve)", () => {
      const result = validateApplicationTransition(
        "PENDING_APPROVAL",
        "ACTIVE",
      );
      expect(result.valid).toBe(true);
    });

    it("allows PENDING_APPROVAL → INACTIVE (deny)", () => {
      const result = validateApplicationTransition(
        "PENDING_APPROVAL",
        "INACTIVE",
      );
      expect(result.valid).toBe(true);
    });

    it("rejects transition from non-PENDING_APPROVAL status", () => {
      const result = validateApplicationTransition("ACTIVE", "INACTIVE");
      expect(result.valid).toBe(false);
    });

    it("rejects PENDING_APPROVAL → INVITED", () => {
      const result = validateApplicationTransition(
        "PENDING_APPROVAL",
        "INVITED",
      );
      expect(result.valid).toBe(false);
    });
  });
});
