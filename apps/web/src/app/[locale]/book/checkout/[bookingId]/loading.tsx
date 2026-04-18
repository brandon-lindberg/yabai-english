import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading checkout"
      className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="1/2" />

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          <Skeleton height="5" width="2/3" />
          <div className="space-y-1">
            <Skeleton height="3" width="full" />
            <Skeleton height="3" width="3/4" />
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <Skeleton height="3" width="1/2" />
            <Skeleton height="3" width="2/3" />
            <Skeleton height="3" width="1/2" />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Skeleton height="5" width="1/3" />
            <Skeleton height="6" width="1/4" />
          </div>
          <div className="pt-2 rounded-full bg-foreground/10 py-3 text-center">
            <Skeleton height="5" width="1/3" className="mx-auto" />
          </div>
        </div>
      </div>
    </main>
  );
}
