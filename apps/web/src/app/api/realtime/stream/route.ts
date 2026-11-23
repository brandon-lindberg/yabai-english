import { NextResponse } from "next/server";

import { drainAchievementWork, readRecentAwardNotices } from "@/lib/achievements/achievement-work";
import { achievementScope } from "@/lib/achievements/rarity";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { prisma } from "@/lib/prisma";
import { REALTIME_EVENTS } from "@/lib/realtime-events";
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
  const scope = achievementScope(isTeacherCabinetRole(session.user.role), session.user.learningLanguage ?? "ENGLISH");
  const encoder = new TextEncoder();

  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const resources: { heartbeat?: ReturnType<typeof setInterval>; unsubscribe?: () => void } = {};
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(resources.heartbeat);
        resources.unsubscribe?.();
        req.signal.removeEventListener("abort", cleanup);
        try { controller.close(); } catch { /* Cancellation may have closed the stream already. */ }
      };
      if (req.signal.aborted) { cleanup(); return; }
      req.signal.addEventListener("abort", cleanup, { once: true });

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          if ((controller.desiredSize ?? 0) < -32) { cleanup(); return; }
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const sync = (urgent = false) => {
        void drainAchievementWork(prisma, new Date(), urgent).catch(() => {});
      };
      resources.unsubscribe = subscribeToUserRealtime(userId, (event) => {
        if (event.event === "achievement-work") { sync(true); return; }
        safeEnqueue(encodeFrame(event));
        if (event.event === REALTIME_EVENTS.CHAT_UPDATE || event.event === REALTIME_EVENTS.NOTIFICATIONS_UPDATE) sync();
      });

      resources.heartbeat = setInterval(() => {
        safeEnqueue(`: keep-alive\n\n`);
        sync();
      }, HEARTBEAT_INTERVAL_MS);

      safeEnqueue(`event: connected\ndata: {}\n\n`);
      void readRecentAwardNotices(prisma, userId, scope).then(awards => {
        if (awards.length) safeEnqueue(encodeFrame({ event: REALTIME_EVENTS.ACHIEVEMENTS, payload: awards }));
      }).catch(() => {});
      sync();
    },
    cancel() { cleanup(); },
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
