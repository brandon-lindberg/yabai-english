import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root locale loading fallback.
 *
 * This Suspense boundary wraps ALL routes under [locale] while their async
 * layouts resolve (auth, i18n, onboarding gates, etc.).  It must NOT look
 * like any specific page — just a minimal, neutral placeholder that gives
 * visual feedback without causing a jarring layout shift.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6"
    >
      <Skeleton height="8" width="1/3" />
      <div className="mt-3">
        <Skeleton height="4" width="2/3" />
      </div>
      <div className="mt-6 space-y-4">
        <Skeleton height="4" width="full" />
        <Skeleton height="4" width="full" />
        <Skeleton height="4" width="3/4" />
      </div>
    </div>
  );
}
