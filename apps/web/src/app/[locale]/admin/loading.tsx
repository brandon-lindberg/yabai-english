import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main role="status" aria-busy="true" aria-label="Loading admin home" className="max-w-4xl">
      <Skeleton height="8" width="1/3" />

      <section className="mt-10">
        <Skeleton height="6" width="1/4" />
        <ul className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <Skeleton height="4" width="full" />
              <div className="mt-1">
                <Skeleton height="3" width="3/4" />
              </div>
              <div className="mt-1">
                <Skeleton height="3" width="1/4" className="!w-12" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <Skeleton height="6" width="1/3" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <Skeleton height="4" width="2/3" />
              <div className="mt-2 space-y-1">
                <Skeleton height="3" width="full" />
                <Skeleton height="3" width="3/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
