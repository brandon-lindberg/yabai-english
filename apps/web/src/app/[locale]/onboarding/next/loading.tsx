import {
  Skeleton,
  SkeletonButton,
  SkeletonText,
} from "@/components/ui/skeleton";

const CHECKLIST_ROWS = 6;

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading onboarding checklist"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="1/2" />
      <div className="mt-2">
        <SkeletonText lines={1} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1">
          <Skeleton height="3" rounded="full" />
        </div>
        <Skeleton height="3" width="1/4" />
      </div>

      <div className="mt-6 space-y-3">
        {Array.from({ length: CHECKLIST_ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5"
          >
            <Skeleton height="6" width="1/4" rounded="full" className="!h-6 !w-6 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton height="5" width="1/3" />
              <SkeletonText lines={2} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Skeleton height="3" width="1/3" />
        <SkeletonButton width="1/3" />
      </div>
    </main>
  );
}
