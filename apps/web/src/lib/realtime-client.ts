"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketUserId: string | null = null;

export function getRealtimeSocket(userId: string) {
  const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001";
  if (socket && socketUserId === userId) return socket;

  if (socket) {
    socket.disconnect();
  }

  socket = io(realtimeUrl, {
    auth: { userId },
    withCredentials: true,
  });
  socketUserId = userId;
  return socket;
}
