/**
 * Roles that can be handed out from the member invite forms.
 *
 * `OWNER` is deliberately absent: ownership transfers are not an invite, and
 * offering it in a dropdown would let any org admin mint another owner.
 *
 * The two invite forms each hard-coded this list in English
 * (`School Admin` / `Teacher` / `Student`), so they could drift from each other
 * and from the `OrgRole` enum. One list, translated at the call site.
 */
export const ORG_INVITE_ROLES = ["ORG_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"] as const;

/** School-scoped invites cannot grant org-wide administration. */
export const SCHOOL_INVITE_ROLES = ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] as const;

export type OrgInviteRole = (typeof ORG_INVITE_ROLES)[number];
