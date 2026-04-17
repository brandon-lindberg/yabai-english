import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  subscribeToUserRealtime,
  type RealtimeEvent,
} from "@/lib/realtime-bus";

// This route must stay on the Node runtime: we rely on Node's EventEmitter
// for the pub/sub bus and the edge runtime's fetch streaming has subtly
// different semantics for long-lived responses.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Heartbeat keeps the connection alive across proxies/load balancers that
// aggressively close idle sockets. It's a single SSE comment every 25s, not a
// client-driven poll.
const HEARTBEAT_INTERVAL_MS = 25_000;

function encodeFrame(event: RealtimeEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.payload)}\n\n`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      safeEnqueue(`event: connected\ndata: {}\n\n`);

      const unsubscribe = subscribeToUserRealtime(userId, (event) => {
        safeEnqueue(encodeFrame(event));
      });

      const heartbeat = setInterval(() => {
        safeEnqueue(`: keep-alive\n\n`);
      }, HEARTBEAT_INTERVAL_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
