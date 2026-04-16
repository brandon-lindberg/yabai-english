import { describe, expect, test } from "vitest";
import {
  GOOGLE_SCOPES,
  buildGoogleFeatureState,
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
