import { describe, expect, test } from "vitest";
import {
  ALL_GOOGLE_SCOPES,
  GOOGLE_SCOPES,
  buildGoogleConnectState,
  buildPostCallbackReturnUrl,
  parseGoogleConnectState,
  deriveConnectionFlags,
  hasAllGoogleScopes,
} from "@/lib/google/integration";

describe("google connect scopes", () => {
  test("one consent asks for every scope the app uses", () => {
    // Connecting used to be three journeys, one per feature. If a scope is
    // added to the app it belongs in this list, or nobody will ever grant it.
    expect(ALL_GOOGLE_SCOPES).toEqual([
      GOOGLE_SCOPES.calendarEvents,
      GOOGLE_SCOPES.calendarReadonly,
      GOOGLE_SCOPES.driveFile,
      GOOGLE_SCOPES.documents,
      GOOGLE_SCOPES.meetSpaceCreated,
    ]);
  });

  test("identity scopes are not re-requested — base sign-in already holds them", () => {
    expect(ALL_GOOGLE_SCOPES).not.toContain(GOOGLE_SCOPES.identityEmail);
    expect(ALL_GOOGLE_SCOPES).not.toContain(GOOGLE_SCOPES.identityProfile);
    expect(ALL_GOOGLE_SCOPES).not.toContain(GOOGLE_SCOPES.identityOpenId);
  });
});

describe("state payload", () => {
  test("encodes and decodes without a feature", () => {
    const encoded = buildGoogleConnectState({
      userId: "u_1",
      returnTo: "/dashboard/settings",
    });
    expect(parseGoogleConnectState(encoded)).toEqual({
      userId: "u_1",
      returnTo: "/dashboard/settings",
    });
  });

  test("round-trips a returnTo that itself contains the separator", () => {
    const returnTo = "/dashboard/settings?onboardingNext=/onboarding/next:1";
    const encoded = buildGoogleConnectState({ userId: "u_1", returnTo });
    expect(parseGoogleConnectState(encoded)).toEqual({ userId: "u_1", returnTo });
  });

  test("rejects malformed state", () => {
    expect(parseGoogleConnectState(Buffer.from("u_1", "utf8").toString("base64url"))).toBeNull();
  });
});

describe("deriveConnectionFlags", () => {
  test("reports each capability from what Google actually granted", () => {
    expect(
      deriveConnectionFlags([
        GOOGLE_SCOPES.calendarEvents,
        GOOGLE_SCOPES.calendarReadonly,
        GOOGLE_SCOPES.driveFile,
        GOOGLE_SCOPES.documents,
      ]),
    ).toEqual({
      calendarConnected: true,
      driveConnected: true,
      meetConnected: false,
    });
  });

  test("treats calendar as connected when calendar.events is granted", () => {
    expect(deriveConnectionFlags([GOOGLE_SCOPES.calendarEvents])).toEqual({
      calendarConnected: true,
      driveConnected: false,
      meetConnected: false,
    });
  });

  test("a declined scope stays declined — the flag must not be optimistic", () => {
    // A user can untick an individual permission on Google's consent screen.
    // The code that calls Drive relies on this being honest.
    const granted = ALL_GOOGLE_SCOPES.filter((s) => s !== GOOGLE_SCOPES.driveFile);
    expect(deriveConnectionFlags(granted).driveConnected).toBe(false);
  });
});

describe("hasAllGoogleScopes", () => {
  test("true only when every scope is present", () => {
    expect(hasAllGoogleScopes(ALL_GOOGLE_SCOPES)).toBe(true);
  });

  test("false for a partial grant from the old per-feature flow", () => {
    expect(
      hasAllGoogleScopes([GOOGLE_SCOPES.calendarEvents, GOOGLE_SCOPES.calendarReadonly]),
    ).toBe(false);
    expect(hasAllGoogleScopes([])).toBe(false);
  });

  test("extra scopes do not make it false", () => {
    expect(hasAllGoogleScopes([...ALL_GOOGLE_SCOPES, "https://example.com/extra"])).toBe(true);
  });
});

describe("buildPostCallbackReturnUrl", () => {
  test("appends the google result to a plain path", () => {
    expect(buildPostCallbackReturnUrl("/dashboard/settings", { google: "connected" })).toBe(
      "/dashboard/settings?google=connected",
    );
  });

  test("preserves existing onboardingNext query param when appending", () => {
    const url = buildPostCallbackReturnUrl(
      "/dashboard/settings?onboardingNext=%2Fonboarding%2Fnext",
      { google: "connected" },
    );
    expect(url).toContain("onboardingNext=%2Fonboarding%2Fnext");
    expect(url).toContain("google=connected");
    expect(url.startsWith("/dashboard/settings?")).toBe(true);
  });

  test("strips a stale feature param left over from the old per-feature flow", () => {
    const url = buildPostCallbackReturnUrl(
      "/dashboard/settings?google=connected&feature=drive&onboardingNext=%2Fx",
      { google: "connected" },
    );
    expect(url).not.toContain("feature=");
    expect(url).toContain("onboardingNext=%2Fx");
  });

  test("ignores absolute URLs and keeps them relative", () => {
    const url = buildPostCallbackReturnUrl(
      "/dashboard/settings?onboardingNext=%2Fonboarding%2Fnext",
      { google: "connected" },
    );
    expect(url.startsWith("/")).toBe(true);
    expect(url.includes("://")).toBe(false);
  });
});
