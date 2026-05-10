/**
 * Admin area tabs (same paths as {@link AdminSubnav} under `/admin`).
 * Kept in lib so the dashboard shell can mirror links for super-admins.
 */
export const ADMIN_SUBNAV_ROUTES = [
  ["/admin", "overview"],
  ["/admin/schools", "schools"],
  ["/admin/users", "users"],
  ["/admin/teachers", "teachers"],
  ["/admin/students", "students"],
  ["/admin/reports", "reports"],
] as const;
