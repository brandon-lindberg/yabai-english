import {
  Skeleton,
  SkeletonButton,
  SkeletonCard,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading assessment"
      className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="3" width="1/4" />

      <div className="mt-4 space-y-2">
        <Skeleton height="8" width="1/2" />
        <Skeleton height="5" width="1/3" />
      </div>

      <div className="mt-8">
        <SkeletonCard padding="lg">
          <div className="space-y-4">
            <Skeleton height="5" width="2/3" />
            <div className="space-y-2">
              <Skeleton height="10" rounded="xl" />
              <Skeleton height="10" rounded="xl" />
              <Skeleton height="10" rounded="xl" />
              <Skeleton height="10" rounded="xl" />
            </div>
            <div className="pt-2">
              <SkeletonButton width="1/3" />
            </div>
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
