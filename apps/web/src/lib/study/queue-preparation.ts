import { z } from "zod";

export const QUEUE_STREAM_TYPE = "application/x-ndjson";
export type QueuePreparationProgress = { completed: number; total: number };
export type ReportQueuePreparation = (progress: QueuePreparationProgress) => void;
const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), completed: z.number().int().nonnegative(), total: z.number().int().positive() }),
  z.object({ type: z.literal("ready"), data: z.unknown() }),
  z.object({ type: z.literal("error"), status: z.number().int().min(400).max(599), error: z.string() }),
]);
export class QueuePreparationError extends Error {
  constructor(message: string, readonly status = 500) { super(message); }
}

/** One streaming reader for both subjects; plain JSON remains supported. */
export async function readPreparedQueue(response: Response, report: ReportQueuePreparation): Promise<unknown> {
  if (!response.ok) throw new QueuePreparationError("QUEUE_FAILED", response.status);
  if (!response.headers?.get("Content-Type")?.includes(QUEUE_STREAM_TYPE)) return response.json();
  if (!response.body) throw new QueuePreparationError("EMPTY_QUEUE_STREAM");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "", bytes = 0, progress: QueuePreparationProgress | undefined;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) throw new QueuePreparationError("INCOMPLETE_QUEUE_STREAM");
      bytes += value.byteLength;
      if (bytes > 1_048_576) throw new QueuePreparationError("QUEUE_STREAM_TOO_LARGE");
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        const event = eventSchema.parse(JSON.parse(line));
        if (event.type === "error") throw new QueuePreparationError(event.error, event.status);
        if (event.type === "ready") {
          report({ completed: progress?.total ?? 1, total: progress?.total ?? 1 });
          return event.data;
        }
        if (event.completed >= event.total || (progress && (event.total !== progress.total || event.completed < progress.completed))) {
          throw new QueuePreparationError("INVALID_QUEUE_PROGRESS");
        }
        progress = event; report(event);
      }
    }
  } catch (error) {
    if (error instanceof QueuePreparationError || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new QueuePreparationError("INVALID_QUEUE_STREAM");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
