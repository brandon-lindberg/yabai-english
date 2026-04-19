import { describe, expect, test } from "vitest";
import { AccountStatus } from "@/generated/prisma/client";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";

describe("isLoginAllowedForAccountStatus", () => {
  test("allows ACTIVE", () => {
    expect(isLoginAllowedForAccountStatus(AccountStatus.ACTIVE)).toBe(true);
  });

  test("denies HIDDEN", () => {
    expect(isLoginAllowedForAccountStatus(AccountStatus.HIDDEN)).toBe(false);
  });
});
