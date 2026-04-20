import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading availability"
      className="space-y-8"
    >
      <Skeleton height="4" width="full" />

      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3">
          <Skeleton height="6" width="1/3" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            <Skeleton height="8" width="1/4" rounded="lg" className="!w-16" />
            <Skeleton height="8" width="1/4" rounded="lg" className="!w-16" />
            <Skeleton height="8" width="1/4" rounded="lg" className="!w-16" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[5rem] border border-border p-1"
            >
              <Skeleton height="4" width="1/4" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
