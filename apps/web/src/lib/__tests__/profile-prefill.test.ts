import { describe, expect, it } from "vitest";
import { resolveDisplayNameForForm } from "../profile-prefill";

describe("resolveDisplayNameForForm", () => {
  it("uses saved profile name and no hint", () => {
    expect(
      resolveDisplayNameForForm({
        profileDisplayName: "Teacher A",
        userName: "Google Name",
        userEmail: "a@b.com",
      }),
    ).toEqual({ initial: "Teacher A", showPrefillHint: false });
  });

  it("falls back to user name with hint", () => {
    expect(
      resolveDisplayNameForForm({
        profileDisplayName: null,
        userName: "Google Name",
        userEmail: "a@b.com",
      }),
    ).toEqual({ initial: "Google Name", showPrefillHint: true });
  });

  it("falls back to email local part with hint", () => {
    expect(
      resolveDisplayNameForForm({
        profileDisplayName: "  ",
        userName: null,
        userEmail: "hello@example.com",
      }),
    ).toEqual({ initial: "hello", showPrefillHint: true });
  });

  it("returns empty when nothing available", () => {
    expect(
      resolveDisplayNameForForm({
        profileDisplayName: null,
        userName: null,
        userEmail: null,
      }),
    ).toEqual({ initial: "", showPrefillHint: false });
  });
});
