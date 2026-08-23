import { describe, expect, test } from "vitest";
import { resolveAuthErrorKind } from "@/lib/auth-error-kind";

describe("resolveAuthErrorKind", () => {
  test("treats Configuration as recoverable", () => {
    // Auth.js reports an expired or replayed PKCE cookie as `Configuration`,
    // so this is the bucket real users land in most often.
    expect(resolveAuthErrorKind("Configuration")).toBe("retry");
  });

  test("treats a rejected account as not retryable", () => {
    expect(resolveAuthErrorKind("AccessDenied")).toBe("denied");
  });

  test.each(["Verification", "OAuthCallbackError", "OAuthAccountNotLinked", "AccountNotLinked"])(
    "maps %s to retry",
    (code) => {
      expect(resolveAuthErrorKind(code)).toBe("retry");
    },
  );

  test("ignores absent values", () => {
    expect(resolveAuthErrorKind(undefined)).toBeNull();
    expect(resolveAuthErrorKind(null)).toBeNull();
    expect(resolveAuthErrorKind("")).toBeNull();
  });

  test("ignores unknown values rather than showing a default error", () => {
    // The query param is attacker-controllable, so an arbitrary value must not
    // be able to plant a warning banner on the sign-in page.
    expect(resolveAuthErrorKind("NotARealErrorType")).toBeNull();
    expect(resolveAuthErrorKind("<script>")).toBeNull();
  });
});
