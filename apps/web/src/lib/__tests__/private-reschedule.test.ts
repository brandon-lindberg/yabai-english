import { expect, test } from "vitest";
import { hasPendingPrivateReschedule, canResolvePrivateReschedule } from "../private-reschedule";
import { evaluateBookingReschedulePolicy } from "../booking-reschedule";

test("only a cancelled private lesson with a pending request can be restored", () => {
  const booking = { status: "CANCELLED", privateRescheduleStatus: "PENDING", groupLessonSessionId: null };
  expect(hasPendingPrivateReschedule(booking)).toBe(true);
  for (const change of [{ status: "CONFIRMED" }, { privateRescheduleStatus: null }, { privateRescheduleStatus: "CLOSED" },
    { privateRescheduleStatus: "REFUND_REQUESTED" }, { groupLessonSessionId: "group" }]) {
    expect(hasPendingPrivateReschedule({ ...booking, ...change })).toBe(false);
  }
});

test("a pending replacement survives the original start time while preserving the student move limit", () => {
  const input = { actor: "STUDENT" as const, bookingStatus: "CANCELLED" as const, lessonStartsAt: new Date("2020-01-01"),
    rescheduleCount: 0, pendingPrivateReschedule: true };
  expect(evaluateBookingReschedulePolicy(input)).toEqual({ allowed: true });
  expect(evaluateBookingReschedulePolicy({ ...input, pendingPrivateReschedule: false }).allowed).toBe(false);
  expect(evaluateBookingReschedulePolicy({ ...input, rescheduleCount: 1 }).allowed).toBe(false);
  expect(evaluateBookingReschedulePolicy({ ...input, actor: "TEACHER", rescheduleCount: 1 }).allowed).toBe(true);
});

test("only the owning teacher or an admin can resolve a request", () => {
  expect(canResolvePrivateReschedule({ role: "TEACHER", userId: "teacher", teacherUserId: "teacher" })).toBe(true);
  expect(canResolvePrivateReschedule({ role: "TEACHER", userId: "other", teacherUserId: "teacher" })).toBe(false);
  expect(canResolvePrivateReschedule({ role: "STUDENT", userId: "teacher", teacherUserId: "teacher" })).toBe(false);
  expect(canResolvePrivateReschedule({ role: "SUPER_ADMIN", userId: "admin", teacherUserId: "teacher" })).toBe(true);
});
