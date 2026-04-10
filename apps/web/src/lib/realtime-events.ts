export const REALTIME_EVENTS = {
  CHAT_UPDATE: "chat:update",
  NOTIFICATIONS_UPDATE: "notifications:update",
} as const;

export function userRoom(userId: string) {
  return `user:${userId}`;
}
