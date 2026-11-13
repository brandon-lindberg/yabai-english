import "server-only";
import { PrivateApiFailure } from "../private-api-error";
import { QUEUE_STREAM_TYPE, type ReportQueuePreparation } from "./queue-preparation";

/** Opt-in feedback on the same authenticated request; no polling or extra queries. */
export async function queuePreparationResponse<T>(req: Request, run: (report?: ReportQueuePreparation) => Promise<T>): Promise<T | Response> {
  if (!req.headers.get("Accept")?.includes(QUEUE_STREAM_TYPE)) return run(undefined);
  let cancelled = false;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: unknown) => { if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
      const abort = () => { if (!cancelled) { cancelled = true; controller.close(); } };
      req.signal.addEventListener("abort", abort, { once: true });
      if (req.signal.aborted) abort();
      void (async () => {
        try {
          const data = await run(progress => {
            if (cancelled) throw new DOMException("Preparation cancelled", "AbortError");
            send({ type: "progress", ...progress });
          });
          // A transaction-backed service resolves only after COMMIT succeeds.
          send({ type: "ready", data });
        } catch (error) {
          if (!cancelled) {
            if (!(error instanceof PrivateApiFailure)) console.error("Queue preparation failed", error);
            send({ type: "error", status: error instanceof PrivateApiFailure ? error.status : 500,
              error: error instanceof PrivateApiFailure ? error.code : "INTERNAL_ERROR" });
          }
        } finally {
          req.signal.removeEventListener("abort", abort);
          if (!cancelled) { cancelled = true; controller.close(); }
        }
      })();
    },
    cancel() { cancelled = true; },
  });
  return new Response(body, { headers: { "Content-Type": `${QUEUE_STREAM_TYPE}; charset=utf-8`, "Cache-Control": "private, no-store", "X-Accel-Buffering": "no" } });
}
