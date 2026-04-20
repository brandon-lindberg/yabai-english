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

export interface ApplicationCheck {
  applicationFlowEnabled: boolean;
  existingMembershipStatus: OrgMemberStatus | string | null;
}

export interface TransitionResult {
  valid: boolean;
  error?: string;
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

/**
 * Check if a user can apply to join a school.
 */
export function canApplyToSchool(input: ApplicationCheck): EnrollmentResult {
  if (!input.applicationFlowEnabled) {
    return { allowed: false, reason: "This school is not accepting applications" };
  }
  if (input.existingMembershipStatus === "ACTIVE") {
    return { allowed: false, reason: "You are already a member of this school" };
  }
  if (input.existingMembershipStatus === "PENDING_APPROVAL") {
    return { allowed: false, reason: "You already have a pending application" };
  }
  if (input.existingMembershipStatus === "INVITED") {
    return { allowed: false, reason: "You have a pending invitation" };
  }
  // INACTIVE = previously denied, allow re-application
  return { allowed: true };
}

/**
 * Validate an application status transition (approve or deny).
 */
export function validateApplicationTransition(
  currentStatus: OrgMemberStatus | string,
  newStatus: OrgMemberStatus | string,
): TransitionResult {
  if (currentStatus !== "PENDING_APPROVAL") {
    return {
      valid: false,
      error: "Can only transition from PENDING_APPROVAL status",
    };
  }
  if (newStatus !== "ACTIVE" && newStatus !== "INACTIVE") {
    return {
      valid: false,
      error: "Application can only be approved (ACTIVE) or denied (INACTIVE)",
    };
  }
  return { valid: true };
}
