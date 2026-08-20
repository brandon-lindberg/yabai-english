import { PageHeader } from "@/components/ui/page-header";

/** PWA offline fallback. No locale context here, so the copy stays literal. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <PageHeader
        title="Offline"
        description="You appear to be offline. Please check your connection and try again."
      />
    </div>
  );
}
