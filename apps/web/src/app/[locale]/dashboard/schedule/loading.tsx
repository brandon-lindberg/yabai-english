import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real schedule page: subtitle → calendar card (view controls +
 * week grid) → upcoming lessons list.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading schedule"
      className="space-y-8"
    >
      {/* Subtitle */}
      <Skeleton height="4" width="full" />

      {/* ── Calendar card ── */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        {/* Title */}
        <div className="mb-3">
          <Skeleton height="6" width="1/3" />
        </div>
        {/* View controls row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton height="8" width="1/4" rounded="lg" className="!w-8" />
            <Skeleton height="4" width="1/3" className="!w-40" />
            <Skeleton height="8" width="1/4" rounded="lg" className="!w-8" />
          </div>
          <div className="flex gap-1">
            <Skeleton height="8" width="1/4" rounded="lg" className="!w-16" />
            <Skeleton height="8" width="1/4" rounded="lg" className="!w-16" />
            <Skeleton height="8" width="1/4" rounded="lg" className="!w-16" />
          </div>
        </div>
        {/* Week day headers */}
        <div className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`text-center ${i >= 4 ? "hidden md:block" : i >= 2 ? "hidden sm:block" : ""}`}
            >
              <Skeleton height="4" width="full" />
            </div>
          ))}
        </div>
        {/* Week grid cells */}
        <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`min-h-[6rem] rounded-lg border border-border p-2 ${i >= 4 ? "hidden md:block" : i >= 2 ? "hidden sm:block" : ""}`}
            >
              <Skeleton height="4" width="1/3" />
              <div className="mt-2">
                <Skeleton height="6" width="full" rounded="md" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Upcoming section ── */}
      <section>
        <Skeleton height="6" width="1/4" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
            >
              <Skeleton height="4" width="full" />
              <div className="mt-2">
                <Skeleton height="3" width="3/4" />
              </div>
              <div className="mt-1">
                <Skeleton height="3" width="1/2" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Skeleton height="6" width="1/4" rounded="full" className="!w-20" />
                <Skeleton height="4" width="1/4" className="!w-24" />
                <Skeleton height="4" width="1/4" className="!w-20" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
