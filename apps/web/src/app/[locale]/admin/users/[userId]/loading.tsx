import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main role="status" aria-busy="true" aria-label="Loading user detail">
      <Skeleton height="3" width="1/4" className="!w-28" />
      <div className="mt-4">
        <Skeleton height="8" width="1/3" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="3" width="1/4" className="!w-20" />
              <div className="rounded-xl border border-border px-3 py-2.5">
                <Skeleton height="5" width="2/3" />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Skeleton height="10" width="1/4" rounded="full" className="!w-24" />
            <Skeleton height="10" width="1/4" rounded="full" className="!w-20" />
          </div>
        </div>
      </div>
    </main>
  );
}
