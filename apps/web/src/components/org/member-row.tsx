import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { DataRow } from "@/components/ui/data-row";
import { Status } from "@/components/ui/status";

/**
 * One person in an organization or school.
 *
 * The org member list and the school member list rendered this same row twice,
 * in two bordered-and-divided boxes: avatar, name, email, a role chip, a status
 * string. They had already drifted — different gaps, one showing the school
 * name, one not — and the role chip was a filled pill while status was plain
 * grey text, so two facts of equal weight looked like different kinds of thing.
 *
 * Status now uses the ladder: an active member is settled, an invite is still
 * pending, anything else is spent.
 */

function statusTone(status: string) {
  if (status === "ACTIVE") return "settled" as const;
  if (status === "INVITED" || status === "PENDING_APPROVAL") return "pending" as const;
  return "spent" as const;
}

export type MemberGrant = {
  /** The membership row, so an action can name which grant it acts on. */
  id: string;
  role: string;
  status: string;
  /** Translated status text; falls back to the raw enum when absent. */
  statusLabel?: string;
  /** A further fact about placement, e.g. the school name or "org-wide". */
  meta?: string | null;
  actions?: ReactNode;
};

export function MemberRow({
  name,
  email,
  imageUrl,
  grants,
}: {
  name: string;
  email?: string | null;
  imageUrl?: string | null;
  /**
   * Every grant this person holds here, not one row per grant.
   *
   * A membership row is a grant, and one person commonly holds two — org-wide
   * OWNER plus SCHOOL_ADMIN of a school. Printing a row each listed the same
   * person twice, with the same name, the same email and the same avatar, which
   * reads as a duplicate rather than as one person with two roles.
   */
  grants: MemberGrant[];
}) {
  return (
    <DataRow>
      <div className="flex items-start gap-3">
        <Avatar src={imageUrl} name={name || email} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{name}</p>
          {email ? <p className="truncate text-sm text-muted">{email}</p> : null}
          <ul className="mt-1 list-none space-y-1 p-0">
            {grants.map((grant) => (
              <li
                key={grant.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className="text-sm font-medium text-foreground">{grant.role}</span>
                <Status tone={statusTone(grant.status)}>
                  {grant.statusLabel ?? grant.status}
                </Status>
                {grant.meta ? (
                  <span className="text-sm text-muted">{grant.meta}</span>
                ) : null}
                {grant.actions}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DataRow>
  );
}
