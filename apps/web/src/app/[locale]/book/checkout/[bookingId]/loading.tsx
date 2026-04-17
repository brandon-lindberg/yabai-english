import {
  Skeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading checkout"
      className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="1/3" />

      <div className="mt-6">
        <SkeletonCard padding="lg">
          <div className="space-y-4">
            <Skeleton height="5" width="2/3" />
            <SkeletonText lines={2} />
            <div className="space-y-2 border-t border-border pt-4">
              <Skeleton height="3" width="1/3" />
              <Skeleton height="3" width="1/2" />
              <Skeleton height="3" width="1/3" />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Skeleton height="5" width="1/3" />
              <Skeleton height="6" width="1/4" />
            </div>
            <div className="pt-2">
              <SkeletonButton width="full" />
            </div>
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
