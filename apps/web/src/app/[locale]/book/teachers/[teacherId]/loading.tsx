import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading teacher profile"
      className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="2/3" />
      <div className="mt-3">
        <Skeleton height="4" width="full" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Profile card */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <SkeletonAvatar size="xl" />
            <div className="min-w-0 flex-1">
              <Skeleton height="5" width="2/3" />
              <div className="mt-1">
                <Skeleton height="3" width="1/2" />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <Skeleton height="3" width="full" />
            <Skeleton height="3" width="full" />
            <Skeleton height="3" width="3/4" />
            <Skeleton height="3" width="1/2" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton height="6" width="1/4" rounded="full" className="!w-16" />
            <Skeleton height="6" width="1/4" rounded="full" className="!w-16" />
          </div>
        </div>

        {/* Time slots card */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <Skeleton height="5" width="1/2" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border px-3 py-2.5">
                <Skeleton height="4" width="3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking form */}
      <div className="mt-8 space-y-4">
        <Skeleton height="6" width="1/3" />
        <Skeleton height="4" width="full" />
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="space-y-4">
            <div className="rounded-xl border border-border px-3 py-2.5">
              <Skeleton height="5" width="2/3" />
            </div>
            <div className="rounded-xl border border-border px-3 py-2.5">
              <Skeleton height="5" width="2/3" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border px-3 py-2.5">
                <Skeleton height="5" width="2/3" />
              </div>
              <div className="rounded-xl border border-border px-3 py-2.5">
                <Skeleton height="5" width="2/3" />
              </div>
            </div>
            <div className="pt-2">
              <Skeleton height="10" width="1/4" rounded="full" className="!w-28" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
