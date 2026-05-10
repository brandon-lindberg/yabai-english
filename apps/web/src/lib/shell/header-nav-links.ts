export type HeaderNavLinkId =
  | "dashboard"
  | "book"
  | "learn"
  | "schedule"
  | "placement"
  | "admin"
  | "org";

/** Keys under the `common` messages namespace for nav labels */
export type CommonNavLabelKey =
  | "dashboard"
  | "book"
  | "learn"
  | "schedule"
  | "placement"
  | "admin"
  | "org";

export type HeaderNavLink = {
  id: HeaderNavLinkId;
  href: string;
  labelKey: CommonNavLabelKey;
};

export type HeaderNavInput = {
  signedIn: boolean;
  role: string | null | undefined;
  canStartPlacement?: boolean | null;
  activeOrgId?: string | null;
};

/**
 * Primary header navigation links by role (pure; safe for unit tests).
 */
export function getHeaderPrimaryNavLinks(input: HeaderNavInput): HeaderNavLink[] {
  if (!input.signedIn) {
    return [{ id: "book", href: "/book", labelKey: "book" }];
  }
  if (!input.role) return [];

  const orgLink: HeaderNavLink | null = input.activeOrgId
    ? { id: "org", href: `/org/${input.activeOrgId}`, labelKey: "org" }
    : null;

  if (input.role === "STUDENT") {
    const links: HeaderNavLink[] = [
      { id: "dashboard", href: "/dashboard", labelKey: "dashboard" },
      { id: "book", href: "/book", labelKey: "book" },
      { id: "learn", href: "/learn/study", labelKey: "learn" },
      { id: "schedule", href: "/dashboard/schedule", labelKey: "schedule" },
    ];
    if (input.canStartPlacement) {
      links.push({
        id: "placement",
        href: "/placement",
        labelKey: "placement",
      });
    }
    if (orgLink) links.push(orgLink);
    return links;
  }

  if (input.role === "TEACHER") {
    const links: HeaderNavLink[] = [
      { id: "dashboard", href: "/dashboard", labelKey: "dashboard" },
      { id: "schedule", href: "/dashboard/schedule", labelKey: "schedule" },
    ];
    if (orgLink) links.push(orgLink);
    return links;
  }

  if (input.role === "SUPER_ADMIN") {
    const links: HeaderNavLink[] = [
      { id: "dashboard", href: "/dashboard", labelKey: "dashboard" },
      { id: "schedule", href: "/dashboard/schedule", labelKey: "schedule" },
      { id: "admin", href: "/admin", labelKey: "admin" },
    ];
    if (orgLink) links.push(orgLink);
    return links;
  }

  if (orgLink) return [orgLink];
  return [];
}
