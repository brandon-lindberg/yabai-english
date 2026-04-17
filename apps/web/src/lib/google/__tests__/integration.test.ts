import { describe, expect, test } from "vitest";
import {
  GOOGLE_SCOPES,
  buildGoogleFeatureState,
  buildPostCallbackReturnUrl,
  featureFromState,
  scopesForFeature,
  deriveConnectionFlags,
} from "@/lib/google/integration";

describe("google integration scope helpers", () => {
  test("returns calendar scope set for calendar feature", () => {
    const scopes = scopesForFeature("calendar");
    expect(scopes).toEqual([
      GOOGLE_SCOPES.calendarEvents,
      GOOGLE_SCOPES.calendarReadonly,
    ]);
  });

  test("returns drive/docs scopes for drive feature", () => {
    const scopes = scopesForFeature("drive");
    expect(scopes).toEqual([
      GOOGLE_SCOPES.driveFile,
      GOOGLE_SCOPES.documents,
    ]);
  });

  test("encodes and decodes state payload", () => {
    const encoded = buildGoogleFeatureState({
      userId: "u_1",
      feature: "meet",
      returnTo: "/dashboard/integrations",
    });
    const parsed = featureFromState(encoded);
    expect(parsed).toEqual({
      userId: "u_1",
      feature: "meet",
      returnTo: "/dashboard/integrations",
    });
  });

  test("derives connected flags from granted scopes", () => {
    const flags = deriveConnectionFlags([
      GOOGLE_SCOPES.calendarEvents,
      GOOGLE_SCOPES.calendarReadonly,
      GOOGLE_SCOPES.driveFile,
      GOOGLE_SCOPES.documents,
    ]);
    expect(flags).toEqual({
      calendarConnected: true,
      driveConnected: true,
      meetConnected: false,
    });
  });

  test("returns meet scope set for meet feature", () => {
    const scopes = scopesForFeature("meet");
    expect(scopes).toEqual([GOOGLE_SCOPES.meetSpaceCreated]);
  });
});

describe("buildPostCallbackReturnUrl", () => {
  test("appends google+feature to a plain path", () => {
    const url = buildPostCallbackReturnUrl("/dashboard/integrations", {
      google: "connected",
      feature: "calendar",
    });
    expect(url).toBe("/dashboard/integrations?google=connected&feature=calendar");
  });

  test("preserves existing onboardingNext query param when appending", () => {
    const returnTo =
      "/dashboard/integrations?onboardingNext=%2Fonboarding%2Fnext";
    const url = buildPostCallbackReturnUrl(returnTo, {
      google: "connected",
      feature: "calendar",
    });
    expect(url).toContain("onboardingNext=%2Fonboarding%2Fnext");
    expect(url).toContain("google=connected");
    expect(url).toContain("feature=calendar");
    expect(url.startsWith("/dashboard/integrations?")).toBe(true);
  });

  test("overwrites duplicate google/feature params on returnTo", () => {
    const returnTo =
      "/dashboard/integrations?google=connected&feature=drive&onboardingNext=%2Fx";
    const url = buildPostCallbackReturnUrl(returnTo, {
      google: "connected",
      feature: "calendar",
    });
    expect(url).toContain("feature=calendar");
    expect(url).not.toContain("feature=drive");
    expect(url).toContain("onboardingNext=%2Fx");
  });

  test("ignores absolute URLs and keeps them relative", () => {
    const url = buildPostCallbackReturnUrl(
      "/dashboard/integrations?onboardingNext=%2Fonboarding%2Fnext",
      { google: "connected", feature: "calendar" },
    );
    expect(url.startsWith("/")).toBe(true);
    expect(url.includes("://")).toBe(false);
  });
});
