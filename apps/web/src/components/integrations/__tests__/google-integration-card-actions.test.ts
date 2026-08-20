import { describe, expect, test } from "vitest";
import { buildConnectHref } from "@/components/integrations/google-integration-card-actions";

describe("buildConnectHref", () => {
  test("returns a stable connect URL without onboardingNext", () => {
    // No `feature`: connecting Google is one action that grants every scope.
    expect(buildConnectHref()).toBe(
      "/api/integrations/google/connect?returnTo=" + encodeURIComponent("/dashboard/settings"),
    );
  });

  test("never asks for a subset of permissions", () => {
    expect(buildConnectHref()).not.toContain("feature=");
    expect(buildConnectHref("/onboarding/next", "integrations")).not.toContain("feature=");
  });

  test("returns an identical URL whether onboardingNext is null or undefined", () => {
    expect(buildConnectHref(null)).toBe(buildConnectHref(undefined));
  });

  test("embeds onboardingNext into returnTo when provided", () => {
    const href = buildConnectHref("/onboarding/next");
    expect(href).toContain(
      "returnTo=" +
        encodeURIComponent(
          "/dashboard/settings?onboardingNext=" + encodeURIComponent("/onboarding/next"),
        ),
    );
  });

  test("carries onboardingStep alongside onboardingNext", () => {
    const href = buildConnectHref("/onboarding/next", "integrations");
    expect(decodeURIComponent(href)).toContain("onboardingStep=integrations");
  });

  test("is deterministic and does not read window", () => {
    // Same inputs always produce the same output regardless of environment.
    expect(buildConnectHref("/onboarding/next")).toBe(buildConnectHref("/onboarding/next"));
  });
});
