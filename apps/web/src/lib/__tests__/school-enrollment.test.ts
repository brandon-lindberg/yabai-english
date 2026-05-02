import { describe, it, expect } from "vitest";
import { canEnrollStudent } from "../school-enrollment";

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
});
