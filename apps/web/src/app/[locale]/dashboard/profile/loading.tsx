import {
  Skeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading profile"
      className="space-y-6"
    >
      <div>
        <Skeleton height="8" width="1/3" />
        <div className="mt-3">
          <SkeletonText lines={2} lastLineWidth="2/3" />
        </div>
      </div>

      <SkeletonCard padding="lg">
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="3" width="1/4" />
              <Skeleton height="10" rounded="xl" />
            </div>
          ))}

          <div>
            <Skeleton height="3" width="1/4" />
            <div className="mt-2">
              <Skeleton height="24" rounded="xl" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <SkeletonButton width="1/3" />
            <SkeletonButton width="1/4" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
