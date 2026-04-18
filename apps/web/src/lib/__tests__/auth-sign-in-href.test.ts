import { describe, expect, it } from "vitest";
import { authSignInHref } from "../auth-sign-in-href";

describe("authSignInHref", () => {
  it("encodes callbackUrl query", () => {
    const href = authSignInHref("/book?specialty=x");
    expect(href.startsWith("/auth/signin?callbackUrl=")).toBe(true);
    expect(decodeURIComponent(href.split("callbackUrl=")[1] ?? "")).toBe("/book?specialty=x");
  });

  it("falls back for unsafe paths", () => {
    const href = authSignInHref("/evil", "/dashboard");
    expect(href).toContain(encodeURIComponent("/dashboard"));
  });
});
