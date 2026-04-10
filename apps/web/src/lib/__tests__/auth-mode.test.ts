import { afterEach, describe, expect, test } from "vitest";
import { getAuthMode } from "@/lib/auth-mode";

const originalGoogleId = process.env.AUTH_GOOGLE_ID;
const originalGoogleSecret = process.env.AUTH_GOOGLE_SECRET;
const originalDevBypass = process.env.DEV_AUTH_BYPASS;
const originalNodeEnv = process.env.NODE_ENV;

describe("getAuthMode", () => {
  afterEach(() => {
    process.env.AUTH_GOOGLE_ID = originalGoogleId;
    process.env.AUTH_GOOGLE_SECRET = originalGoogleSecret;
    process.env.DEV_AUTH_BYPASS = originalDevBypass;
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  });

  test("returns google enabled when oauth env vars are set", () => {
    process.env.AUTH_GOOGLE_ID = "id";
    process.env.AUTH_GOOGLE_SECRET = "secret";

    expect(getAuthMode()).toEqual({
      hasGoogleOAuth: true,
      devEmailSignIn: false,
    });
  });

  test("does not enable dev sign-in by default", () => {
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.DEV_AUTH_BYPASS;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    expect(getAuthMode()).toEqual({
      hasGoogleOAuth: false,
      devEmailSignIn: false,
    });
  });

  test("enables dev email sign-in only with explicit bypass flag", () => {
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    process.env.DEV_AUTH_BYPASS = "true";
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    expect(getAuthMode()).toEqual({
      hasGoogleOAuth: false,
      devEmailSignIn: true,
    });
  });
});
