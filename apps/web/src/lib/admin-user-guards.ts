import { Role } from "@/generated/prisma/client";

export type AdminDeleteUserCheck =
  | { ok: true }
  | { ok: false; status: 400 | 403; error: string };

/**
 * Rules: no self-delete; cannot remove the last ADMIN account.
 */
export function checkAdminCanDeleteUser(params: {
  actorUserId: string;
  targetUserId: string;
  targetRole: Role;
  adminUserCount: number;
}): AdminDeleteUserCheck {
  if (params.actorUserId === params.targetUserId) {
    return { ok: false, status: 400, error: "Cannot delete your own account." };
  }
  if (params.targetRole === Role.ADMIN && params.adminUserCount <= 1) {
    return { ok: false, status: 403, error: "Cannot delete the last admin account." };
  }
  return { ok: true };
}
