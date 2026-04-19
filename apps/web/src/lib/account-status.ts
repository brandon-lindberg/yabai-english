import { AccountStatus } from "@/generated/prisma/client";

export function isLoginAllowedForAccountStatus(status: AccountStatus): boolean {
  return status === AccountStatus.ACTIVE;
}
