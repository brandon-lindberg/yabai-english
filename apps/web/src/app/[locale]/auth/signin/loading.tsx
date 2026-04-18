import { Skeleton } from "@/components/ui/skeleton";

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
          <Skeleton height="8" width="1/2" />
          <div className="mt-3 space-y-2">
            <Skeleton height="4" width="full" />
            <Skeleton height="4" width="2/3" />
          </div>
        </div>
        <div className="rounded-full border border-border py-3 text-center">
          <Skeleton height="5" width="1/2" className="mx-auto" />
        </div>
        <div className="flex justify-center">
          <Skeleton height="3" width="1/3" />
        </div>
      </div>
    </main>
  );
}
