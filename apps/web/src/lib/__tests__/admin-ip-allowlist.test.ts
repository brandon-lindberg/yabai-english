import { describe, expect, test } from "vitest";
import {
  clientIpFromHeaders,
  isAdminPath,
  isIpAllowed,
  parseAdminIpAllowlist,
  shouldBlockAdminRequest,
} from "@/lib/admin-ip-allowlist";

describe("isAdminPath", () => {
  test("matches admin API routes", () => {
    expect(isAdminPath("/api/admin/users")).toBe(true);
    expect(isAdminPath("/api/admin/teacher-tiers/evaluate")).toBe(true);
  });

  test("matches locale-prefixed admin pages", () => {
    expect(isAdminPath("/en/admin")).toBe(true);
    expect(isAdminPath("/ja/admin/teachers")).toBe(true);
    expect(isAdminPath("/admin")).toBe(true);
  });

  test("does not match non-admin routes or lookalike segments", () => {
    expect(isAdminPath("/en/dashboard")).toBe(false);
    expect(isAdminPath("/api/bookings")).toBe(false);
    expect(isAdminPath("/en/administration")).toBe(false);
    expect(isAdminPath("/api/administrator/users")).toBe(false);
  });
});

describe("parseAdminIpAllowlist", () => {
  test("splits on commas and trims whitespace", () => {
    expect(parseAdminIpAllowlist(" 203.0.113.5, 198.51.100.0/24 ,2001:db8::1 ")).toEqual([
      "203.0.113.5",
      "198.51.100.0/24",
      "2001:db8::1",
    ]);
  });

  test("returns empty list for unset or blank values", () => {
    expect(parseAdminIpAllowlist(undefined)).toEqual([]);
    expect(parseAdminIpAllowlist(null)).toEqual([]);
    expect(parseAdminIpAllowlist("  ")).toEqual([]);
  });
});

describe("isIpAllowed", () => {
  test("matches exact IPv4 addresses", () => {
    expect(isIpAllowed("203.0.113.5", ["203.0.113.5"])).toBe(true);
    expect(isIpAllowed("203.0.113.6", ["203.0.113.5"])).toBe(false);
  });

  test("matches IPv4 CIDR ranges", () => {
    expect(isIpAllowed("198.51.100.42", ["198.51.100.0/24"])).toBe(true);
    expect(isIpAllowed("198.51.101.42", ["198.51.100.0/24"])).toBe(false);
  });

  test("matches exact IPv6 addresses case-insensitively", () => {
    expect(isIpAllowed("2001:DB8::1", ["2001:db8::1"])).toBe(true);
    expect(isIpAllowed("2001:db8::2", ["2001:db8::1"])).toBe(false);
  });

  test("matches IPv4-mapped IPv6 client addresses against IPv4 entries", () => {
    expect(isIpAllowed("::ffff:203.0.113.5", ["203.0.113.5"])).toBe(true);
    expect(isIpAllowed("::ffff:198.51.100.42", ["198.51.100.0/24"])).toBe(true);
  });

  test("rejects missing client IPs", () => {
    expect(isIpAllowed(null, ["203.0.113.5"])).toBe(false);
    expect(isIpAllowed("", ["203.0.113.5"])).toBe(false);
  });
});

describe("clientIpFromHeaders", () => {
  test("uses the first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.5");
  });

  test("returns null when the header is absent", () => {
    expect(clientIpFromHeaders(new Headers())).toBe(null);
  });
});

describe("shouldBlockAdminRequest", () => {
  test("never blocks when the allowlist is not configured", () => {
    expect(
      shouldBlockAdminRequest({
        pathname: "/api/admin/users",
        clientIp: null,
        allowlistRaw: undefined,
      }),
    ).toBe(false);
  });

  test("never blocks non-admin paths", () => {
    expect(
      shouldBlockAdminRequest({
        pathname: "/en/dashboard",
        clientIp: "203.0.113.99",
        allowlistRaw: "203.0.113.5",
      }),
    ).toBe(false);
  });

  test("blocks admin paths from IPs outside the allowlist", () => {
    expect(
      shouldBlockAdminRequest({
        pathname: "/en/admin",
        clientIp: "203.0.113.99",
        allowlistRaw: "203.0.113.5",
      }),
    ).toBe(true);
  });

  test("blocks admin paths when the client IP cannot be determined", () => {
    expect(
      shouldBlockAdminRequest({
        pathname: "/api/admin/users",
        clientIp: null,
        allowlistRaw: "203.0.113.5",
      }),
    ).toBe(true);
  });

  test("allows admin paths from allowlisted IPs", () => {
    expect(
      shouldBlockAdminRequest({
        pathname: "/api/admin/users",
        clientIp: "203.0.113.5",
        allowlistRaw: "203.0.113.5, 198.51.100.0/24",
      }),
    ).toBe(false);
  });
});
