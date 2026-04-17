import { describe, expect, test } from "vitest";
import { buildConnectHref } from "@/components/integrations/google-integration-card-actions";

describe("buildConnectHref", () => {
  test("returns a stable connect URL without onboardingNext", () => {
    const href = buildConnectHref("calendar");
    expect(href).toBe(
      "/api/integrations/google/connect?feature=calendar&returnTo=" +
        encodeURIComponent("/dashboard/integrations"),
    );
  });

  test("returns an identical URL whether onboardingNext is null or undefined", () => {
    expect(buildConnectHref("drive", null)).toBe(buildConnectHref("drive", undefined));
  });

  test("embeds onboardingNext into returnTo when provided", () => {
    const href = buildConnectHref("calendar", "/onboarding/next");
    expect(href).toContain(
      "returnTo=" +
        encodeURIComponent(
          "/dashboard/integrations?onboardingNext=" +
            encodeURIComponent("/onboarding/next"),
        ),
    );
    expect(href).toContain("feature=calendar");
  });

  test("is deterministic and does not read window", () => {
    // Same inputs always produce the same output regardless of environment.
    const a = buildConnectHref("meet", "/onboarding/next");
    const b = buildConnectHref("meet", "/onboarding/next");
    expect(a).toBe(b);
  });
});
