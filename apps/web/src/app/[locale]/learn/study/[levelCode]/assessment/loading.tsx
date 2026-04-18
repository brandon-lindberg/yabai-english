import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real assessment page: back link → title → pass mark →
 * question fieldsets with radio options → submit button.
 */
export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading assessment"
      className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6"
    >
      {/* Back link */}
      <Skeleton height="3" width="1/4" className="!w-28" />

      {/* Title */}
      <div className="mt-4 space-y-2">
        <Skeleton height="8" width="3/4" />
        <Skeleton height="4" width="1/2" />
      </div>

      {/* Pass mark info */}
      <div className="mt-6">
        <Skeleton height="4" width="2/3" />
      </div>

      {/* Question cards */}
      <div className="mt-8 space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <fieldset
            key={i}
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
          >
            <Skeleton height="3" width="1/4" className="!w-24" />
            <div className="mt-2">
              <Skeleton height="5" width="full" />
              <div className="mt-1">
                <Skeleton height="5" width="2/3" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 sm:py-2"
                >
                  <Skeleton
                    height="5"
                    width="1/4"
                    rounded="full"
                    className="!h-5 !w-5 shrink-0"
                  />
                  <Skeleton height="4" width="3/4" />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Submit button */}
      <div className="mt-8 rounded-xl bg-foreground/15 py-3 text-center">
        <Skeleton height="4" width="1/4" className="mx-auto" />
      </div>
    </main>
  );
}
