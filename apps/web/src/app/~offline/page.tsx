export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-foreground">Offline</h1>
      <p className="mt-3 text-muted">
        You appear to be offline. Please check your connection and try again.
      </p>
    </div>
  );
}
