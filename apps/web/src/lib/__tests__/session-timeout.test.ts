import { describe, expect, test, vi } from "vitest";
import { getInactivityTimeoutMinutes } from "@/lib/session-timeout";

describe("getInactivityTimeoutMinutes", () => {
  test("prefers NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES", () => {
    vi.stubEnv("NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES", "45");
    vi.stubEnv("AUTH_IDLE_TIMEOUT_MINUTES", "20");
    expect(getInactivityTimeoutMinutes()).toBe(45);
  });

  test("falls back to AUTH_IDLE_TIMEOUT_MINUTES", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("AUTH_IDLE_TIMEOUT_MINUTES", "25");
    expect(getInactivityTimeoutMinutes()).toBe(25);
  });

  test("defaults to 12 hours when env is missing/invalid", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES", "-1");
    expect(getInactivityTimeoutMinutes()).toBe(720);
  });
});
