import { Skeleton } from "@/components/ui/skeleton";

/**
 * The people-table placeholder, shared by the admin student, teacher and user
 * lists.
 *
 * Those three `loading.tsx` files were 59–62 lines each and — in the case of
 * students and teachers — differed by exactly one word, the aria-label.
 *
 * A skeleton is a promise about what is arriving, so it has to be redrawn when
 * the page is. All of these still showed the bordered card the lists used
 * before the redesign, which meant every admin page flashed the old design and
 * then resolved into the new one.
 */
export function SkeletonUserTable({ label }: { label: string }) {
  return (
    <main role="status" aria-busy="true" aria-label={label}>
      <Skeleton height="8" width="1/4" />

      <div className="mt-6 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1">
            <Skeleton height="10" width="full" rounded="xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton height="10" width="1/4" rounded="full" className="!w-24" />
            <Skeleton height="10" width="1/4" rounded="full" className="!w-24" />
          </div>
        </div>

        <div className="mt-6 hidden border-t border-border sm:block">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_120px] gap-2 border-b border-border py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="3" width="1/2" />
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.5fr_1fr_1fr_120px] items-center gap-2 border-b border-border py-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton width="1/4" rounded="full" className="!h-8 !w-8 shrink-0" />
                <Skeleton height="4" width="3/4" />
              </div>
              <Skeleton height="3" width="3/4" />
              <Skeleton height="3" width="1/2" />
              <Skeleton width="1/4" rounded="full" className="!h-7 !w-20 shrink-0" />
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-border sm:hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border py-3">
              <Skeleton width="1/4" rounded="full" className="!h-10 !w-10 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton height="4" width="2/3" />
                <Skeleton height="3" width="1/2" />
              </div>
              <Skeleton width="1/4" rounded="full" className="!h-6 !w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
