import { describe, expect, it } from "vitest";
import { redirectTargetForTeacherBookingPage } from "@/lib/teacher-booking-page-access";

describe("redirectTargetForTeacherBookingPage", () => {
  it("allows unauthenticated visitors", () => {
    expect(
      redirectTargetForTeacherBookingPage({
        role: undefined,
        requestedTeacherProfileId: "tp-1",
        viewerTeacherProfileId: null,
      }),
    ).toBeNull();
  });

  it("allows students", () => {
    expect(
      redirectTargetForTeacherBookingPage({
        role: "STUDENT",
        requestedTeacherProfileId: "tp-1",
        viewerTeacherProfileId: null,
      }),
    ).toBeNull();
  });

  it("redirects admins", () => {
    expect(
      redirectTargetForTeacherBookingPage({
        role: "ADMIN",
        requestedTeacherProfileId: "tp-1",
        viewerTeacherProfileId: null,
      }),
    ).toBe("/dashboard");
  });

  it("redirects teachers viewing another teacher's page", () => {
    expect(
      redirectTargetForTeacherBookingPage({
        role: "TEACHER",
        requestedTeacherProfileId: "tp-other",
        viewerTeacherProfileId: "tp-self",
      }),
    ).toBe("/dashboard");
  });

  it("allows teachers to preview their own public page", () => {
    expect(
      redirectTargetForTeacherBookingPage({
        role: "TEACHER",
        requestedTeacherProfileId: "tp-self",
        viewerTeacherProfileId: "tp-self",
      }),
    ).toBeNull();
  });

  it("redirects teachers without a profile id when ids cannot match", () => {
    expect(
      redirectTargetForTeacherBookingPage({
        role: "TEACHER",
        requestedTeacherProfileId: "tp-1",
        viewerTeacherProfileId: null,
      }),
    ).toBe("/dashboard");
  });
});
