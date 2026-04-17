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
      aria-label="Loading teacher onboarding"
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="1/2" />
      <div className="mt-3">
        <SkeletonText lines={2} lastLineWidth="2/3" />
      </div>

      <div className="mt-8 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} padding="md">
            <div className="flex items-start gap-3">
              <Skeleton
                width="1/4"
                rounded="full"
                className="!h-6 !w-6 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton height="5" width="1/3" />
                <SkeletonText lines={2} />
                <div className="pt-2">
                  <SkeletonButton width="1/3" />
                </div>
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </main>
  );
}
