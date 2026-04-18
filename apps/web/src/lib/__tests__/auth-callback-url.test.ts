import { describe, expect, it } from "vitest";
import { resolveSafeCallbackUrl, stripOptionalLocalePrefix } from "../auth-callback-url";

describe("stripOptionalLocalePrefix", () => {
  it("strips /ja prefix", () => {
    expect(stripOptionalLocalePrefix("/ja/book")).toBe("/book");
  });
  it("strips /en prefix", () => {
    expect(stripOptionalLocalePrefix("/en/dashboard")).toBe("/dashboard");
  });
  it("leaves unprefixed paths", () => {
    expect(stripOptionalLocalePrefix("/book")).toBe("/book");
  });
});

describe("resolveSafeCallbackUrl", () => {
  it("allows /book", () => {
    expect(resolveSafeCallbackUrl("/book")).toBe("/book");
  });
  it("allows /book with query", () => {
    expect(resolveSafeCallbackUrl("/book?specialty=a&language=JP")).toBe(
      "/book?specialty=a&language=JP",
    );
  });
  it("allows /ja/book", () => {
    expect(resolveSafeCallbackUrl("/ja/book")).toBe("/ja/book");
  });
  it("allows /book/teachers/id", () => {
    expect(resolveSafeCallbackUrl("/book/teachers/abc")).toBe("/book/teachers/abc");
  });
  it("rejects open redirect", () => {
    expect(resolveSafeCallbackUrl("//evil.com")).toBe("/dashboard");
    expect(resolveSafeCallbackUrl("https://evil.com")).toBe("/dashboard");
  });
  it("rejects unknown prefix", () => {
    expect(resolveSafeCallbackUrl("/admin")).toBe("/dashboard");
  });
  it("rejects path traversal", () => {
    expect(resolveSafeCallbackUrl("/book/../admin")).toBe("/dashboard");
  });
  it("decodes percent-encoding", () => {
    expect(resolveSafeCallbackUrl(encodeURIComponent("/book?x=1"))).toBe("/book?x=1");
  });
  it("uses fallback for empty", () => {
    expect(resolveSafeCallbackUrl(undefined)).toBe("/dashboard");
    expect(resolveSafeCallbackUrl("")).toBe("/dashboard");
  });
});
