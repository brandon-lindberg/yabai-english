import type { ReactNode } from "react";
import { DataRow } from "@/components/ui/data-row";
import { Status } from "@/components/ui/status";

/**
 * One connectable service.
 *
 * There were four of these components — Calendar, Drive/Docs, Meet artifacts
 * and Google identity — and three were byte-for-byte identical apart from a
 * title, two sentences and a `feature` string. They sat in a two-column card
 * grid, which is the page-structure pattern DESIGN.md §4 bans, and every word
 * in all four was hard-coded English in a product whose audience reads
 * Japanese.
 *
 * Connection state was carried by prose alone ("Calendar sync is connected"),
 * so it could not be scanned. It is now a `Status` on the value ladder —
 * settled for connected, open for not — which reads at a glance and does not
 * depend on reading the paragraph.
 */
export function IntegrationRow({
  name,
  description,
  connected,
  connectedLabel,
  disconnectedLabel,
  capabilities,
  actions,
}: {
  name: string;
  description: string;
  /** Omit for a service with no connect/disconnect of its own, e.g. identity. */
  connected?: boolean;
  connectedLabel?: string;
  disconnectedLabel?: string;
  /**
   * What the grant actually enables, read-only.
   *
   * Google's OAuth policy requires that functionality be disabled when a user
   * declines a permission. If we disable something, the user is entitled to see
   * that we did — otherwise the feature is simply missing with no explanation.
   * These are status, not switches: there is still exactly one control.
   */
  capabilities?: Array<{ label: string; enabled: boolean }>;
  actions?: ReactNode;
}) {
  return (
    <DataRow actions={actions}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-base font-bold tracking-[-0.02em] text-foreground">{name}</h3>
        {connected !== undefined ? (
          <Status tone={connected ? "settled" : "open"}>
            {connected ? connectedLabel : disconnectedLabel}
          </Status>
        ) : null}
      </div>
      <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-muted">{description}</p>
      {capabilities && capabilities.length > 0 ? (
        <ul className="mt-3 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0">
          {capabilities.map((capability) => (
            <li key={capability.label}>
              <Status tone={capability.enabled ? "settled" : "spent"}>{capability.label}</Status>
            </li>
          ))}
        </ul>
      ) : null}
    </DataRow>
  );
}
