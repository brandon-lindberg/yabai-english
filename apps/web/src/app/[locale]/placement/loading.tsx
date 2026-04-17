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
      aria-label="Loading placement"
      className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="1/2" />
      <div className="mt-3">
        <SkeletonText lines={2} lastLineWidth="2/3" />
      </div>

      <div className="mt-8">
        <SkeletonCard padding="lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton height="4" width="1/3" />
              <Skeleton height="3" width="1/4" />
            </div>
            <Skeleton height="3" width="1/4" />

            <SkeletonCard padding="md" className="!bg-background">
              <Skeleton height="3" width="1/3" />
              <div className="mt-2">
                <Skeleton height="5" width="2/3" />
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton height="10" rounded="xl" />
                <Skeleton height="10" rounded="xl" />
                <Skeleton height="10" rounded="xl" />
              </div>
            </SkeletonCard>

            <div className="flex justify-end pt-2">
              <SkeletonButton width="1/4" />
            </div>
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
