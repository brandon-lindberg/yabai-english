import type { Role } from "@/generated/prisma/client";

/** Teachers and super-admins may use marketplace teaching tools (roster, lessons, taxonomy). */
export function isTeacherCabinetRole(role: Role | string | undefined): boolean {
  return role === "TEACHER" || role === "SUPER_ADMIN";
}
