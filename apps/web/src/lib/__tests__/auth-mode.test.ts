import { afterEach, expect, test, vi } from "vitest";
import { isGoogleSignInConfigured } from "@/lib/auth-mode";

afterEach(() => vi.unstubAllEnvs());

test.each([["id", "secret", true], ["", "secret", false], ["id", "", false]])(
  "Google requires both credentials",
  (id, secret, configured) => {
    vi.stubEnv("AUTH_GOOGLE_ID", id);
    vi.stubEnv("AUTH_GOOGLE_SECRET", secret);
    expect(isGoogleSignInConfigured()).toBe(configured);
  },
);
