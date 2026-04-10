import { REALTIME_EVENTS } from "@/lib/realtime-events";

const REALTIME_SERVER_URL =
  process.env.REALTIME_SERVER_URL ?? "http://localhost:3001";

async function emitToUser(userId: string, event: string, payload?: unknown) {
  const secret = process.env.REALTIME_SERVER_SECRET;
  await fetch(`${REALTIME_SERVER_URL}/emit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-realtime-secret": secret } : {}),
    },
    body: JSON.stringify({ userId, event, payload }),
    cache: "no-store",
  }).catch(() => {});
}

export async function emitChatUpdate(userId: string, threadId: string) {
  await emitToUser(userId, REALTIME_EVENTS.CHAT_UPDATE, { threadId });
}

export async function emitNotificationsUpdate(userId: string) {
  await emitToUser(userId, REALTIME_EVENTS.NOTIFICATIONS_UPDATE, {});
}
