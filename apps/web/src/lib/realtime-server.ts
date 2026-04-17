import {
  publishChatUpdate,
  publishNotificationsUpdate,
} from "@/lib/realtime-bus";

// Thin async facade around the in-process realtime bus. Kept async to match
// the previous HTTP-shim signatures so existing callers (and their Vitest
// mocks) continue to work without churn.

export async function emitChatUpdate(userId: string, threadId: string) {
  publishChatUpdate(userId, threadId);
}

export async function emitNotificationsUpdate(userId: string) {
  publishNotificationsUpdate(userId);
}
