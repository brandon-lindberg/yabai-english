import type { OrgMemberStatus } from "@/generated/prisma/client";

export interface EnrollmentCheck {
  enrolledCount: number;
  capacity: number;
  studentMembershipStatus: OrgMemberStatus | string;
  isAlreadyEnrolled: boolean;
}

export interface EnrollmentResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a student can be enrolled in a class slot.
 */
export function canEnrollStudent(input: EnrollmentCheck): EnrollmentResult {
  if (input.isAlreadyEnrolled) {
    return { allowed: false, reason: "Student is already enrolled in this class" };
  }
  if (input.studentMembershipStatus !== "ACTIVE") {
    return { allowed: false, reason: "Only active members can be enrolled" };
  }
  if (input.enrolledCount >= input.capacity) {
    return { allowed: false, reason: "Class is full" };
  }
  return { allowed: true };
}
