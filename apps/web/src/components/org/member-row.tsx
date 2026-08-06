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

export function MemberRow({
  name,
  email,
  imageUrl,
  role,
  status,
  statusLabel,
  meta,
  actions,
}: {
  name: string;
  email?: string | null;
  imageUrl?: string | null;
  role: string;
  status: string;
  /** Translated status text; falls back to the raw enum when absent. */
  statusLabel?: string;
  /** A further fact about placement, e.g. the school name or "org-wide". */
  meta?: string | null;
  actions?: ReactNode;
}) {
  return (
    <DataRow actions={actions}>
      <div className="flex items-center gap-3">
        <Avatar src={imageUrl} name={name || email} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{name}</p>
          {email ? <p className="truncate text-sm text-muted">{email}</p> : null}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-foreground">{role}</span>
            <Status tone={statusTone(status)}>{statusLabel ?? status}</Status>
            {meta ? <span className="text-sm text-muted">{meta}</span> : null}
          </p>
        </div>
      </div>
    </DataRow>
  );
}
