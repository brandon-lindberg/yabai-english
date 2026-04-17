import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading sign in"
      className="flex flex-1 flex-col"
    >
      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-12">
        <div>
          <Skeleton height="8" width="1/3" />
          <div className="mt-3">
            <SkeletonText lines={2} lastLineWidth="2/3" />
          </div>
        </div>
        <Skeleton height="12" rounded="full" />
        <div className="flex justify-center">
          <Skeleton height="3" width="1/3" />
        </div>
      </div>
    </main>
  );
}
