import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real profile page (student view): header → form with avatar
 * row, display-name input, rich-text bio editor, and save button.
 * No card wrapper — the real form renders inputs directly in a space-y-6
 * container.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading profile"
      className="space-y-6"
    >
      {/* header — h1 + description */}
      <header>
        <Skeleton height="8" width="1/3" />
        <div className="mt-2">
          <Skeleton height="4" width="2/3" />
        </div>
      </header>

      {/* form — no card wrapper, bare space-y-6 like the real form */}
      <div className="space-y-6">
        {/* Avatar row: 80×80 circle + help text */}
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 rounded-full border border-border bg-foreground/5" />
          <Skeleton height="3" width="1/3" />
        </div>

        {/* Display name: label + input */}
        <div>
          <Skeleton height="3" width="1/4" className="!w-24" />
          <div className="mt-1 w-full rounded-xl border border-border px-3 py-2">
            <Skeleton height="4" width="1/2" />
          </div>
        </div>

        {/* Short bio: label + help text + editor area */}
        <div>
          <Skeleton height="3" width="1/4" className="!w-20" />
          <div className="mt-0.5">
            <Skeleton height="3" width="2/3" />
          </div>
          <div className="mt-2 min-h-[200px] rounded-xl border border-border px-3 py-2">
            <Skeleton height="4" width="full" />
            <div className="mt-1">
              <Skeleton height="4" width="3/4" />
            </div>
            <div className="mt-1">
              <Skeleton height="4" width="1/2" />
            </div>
          </div>
          <div className="mt-1">
            <Skeleton height="3" width="1/4" className="!w-16" />
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-foreground/15 px-5 py-2">
            <Skeleton height="4" width="1/4" className="!w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
