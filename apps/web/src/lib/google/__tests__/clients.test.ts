import { expect, test } from "vitest";
import { createGoogleCalendarClient, createGoogleOAuthClient } from "../clients";

const credentials = { clientId: "test-client", clientSecret: "test-secret" };

test("OAuth preserves the configured callback, client and requested scopes", () => {
  const redirectUri = "https://japanesestudio.love/api/integrations/google/callback";
  const client = createGoogleOAuthClient({ ...credentials, redirectUri });
  const url = new URL(client.generateAuthUrl({ scope: ["scope-one", "scope-two"], access_type: "offline" }));
  expect(url.searchParams.get("client_id")).toBe(credentials.clientId);
  expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
  expect(url.searchParams.get("scope")).toBe("scope-one scope-two");
  expect(url.searchParams.get("access_type")).toBe("offline");
});

test("Calendar clients keep each teacher's credentials separate and support existing event operations", () => {
  const first = createGoogleCalendarClient({ ...credentials, refreshToken: "teacher-one" });
  const second = createGoogleCalendarClient({ ...credentials, refreshToken: "teacher-two" });
  const firstAuth = first.context._options.auth as ReturnType<typeof createGoogleOAuthClient>;
  const secondAuth = second.context._options.auth as ReturnType<typeof createGoogleOAuthClient>;
  expect(firstAuth).not.toBe(secondAuth);
  expect(firstAuth.credentials.refresh_token).toBe("teacher-one");
  expect(secondAuth.credentials.refresh_token).toBe("teacher-two");
  for (const operation of ["insert", "get", "patch", "delete"] as const) expect(first.events[operation]).toBeTypeOf("function");
});
