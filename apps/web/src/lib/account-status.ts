import { AccountStatus } from "@/generated/prisma/client";

export function isLoginAllowedForAccountStatus(status: AccountStatus | undefined): boolean {
  return status === AccountStatus.ACTIVE;
}
