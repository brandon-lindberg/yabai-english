export const ADMIN_SUBNAV_ROUTES = [
  ["/admin", "overview"],
  ["/admin/users", "users"],
  ["/admin/lessons", "lessons"],
  ["/admin/payments", "payments"],
  ["/admin/schools", "schools"],
  ["/admin/reports", "reports"],
] as const;

const peopleRoutes = ["/admin/invite", "/admin/teacher-tiers", "/admin/teachers", "/admin/students"];

export function adminNavIsCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))
    || (href === "/admin/users" && peopleRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)));
}
