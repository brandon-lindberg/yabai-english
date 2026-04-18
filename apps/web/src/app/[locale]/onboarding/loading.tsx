import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading onboarding"
      className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="2/3" />
      <div className="mt-3 space-y-2">
        <Skeleton height="4" width="full" />
        <Skeleton height="4" width="2/3" />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="3" width="1/4" className="!w-20" />
              <div className="rounded-xl border border-border px-3 py-2.5">
                <Skeleton height="5" width="2/3" />
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Skeleton height="10" width="1/4" rounded="full" className="!w-28" />
          </div>
        </div>
      </div>
    </main>
  );
}
