import { afterEach, describe, expect, test, vi } from "vitest";
import { encryptRefreshToken } from "@/lib/calendar-token";

const originalNodeEnv = process.env.NODE_ENV;
const originalKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
const env = process.env as Record<string, string | undefined>;

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
  if (originalKey === undefined) {
    delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  } else {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = originalKey;
  }
  vi.resetModules();
});

describe("calendar token encryption", () => {
  test("throws in production when the key is not valid hex", () => {
    env.NODE_ENV = "production";
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY =
      "86f36b7f2cce5f4b0ccc981fb31740669fca9479f04a2b9a720dfb3384ecfe0g";

    expect(() => encryptRefreshToken("secret-token")).toThrow(
      /CALENDAR_TOKEN_ENCRYPTION_KEY/,
    );
  });
});
