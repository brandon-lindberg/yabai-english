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
      aria-label="Loading user detail"
    >
      <Skeleton height="3" width="1/4" />

      <div className="mt-4">
        <Skeleton height="8" width="1/3" />
      </div>

      <div className="mt-6">
        <SkeletonCard padding="lg">
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton height="3" width="1/4" />
                <Skeleton height="10" rounded="xl" />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <SkeletonButton width="1/3" />
              <SkeletonButton width="1/4" />
            </div>
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
