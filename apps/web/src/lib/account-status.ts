import { AccountStatus } from "@prisma/client";

export function isLoginAllowedForAccountStatus(status: AccountStatus): boolean {
  return status === AccountStatus.ACTIVE;
}
