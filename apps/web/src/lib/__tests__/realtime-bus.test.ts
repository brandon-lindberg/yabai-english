import { describe, expect, test, vi } from "vitest";

import {
  publishChatUpdate,
  publishNotificationsUpdate,
  subscribeToUserRealtime,
} from "@/lib/realtime-bus";

describe("realtime-bus", () => {
  test("delivers chat:update events to subscribers for that user", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToUserRealtime("user-1", handler);
    try {
      publishChatUpdate("user-1", "thread-42");
      expect(handler).toHaveBeenCalledWith({
        event: "chat:update",
        payload: { threadId: "thread-42" },
      });
    } finally {
      unsubscribe();
    }
  });

  test("delivers notifications:update events to subscribers for that user", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToUserRealtime("user-2", handler);
    try {
      publishNotificationsUpdate("user-2");
      expect(handler).toHaveBeenCalledWith({
        event: "notifications:update",
        payload: {},
      });
    } finally {
      unsubscribe();
    }
  });

  test("does not leak events across users", () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const unsubA = subscribeToUserRealtime("user-a", handlerA);
    const unsubB = subscribeToUserRealtime("user-b", handlerB);
    try {
      publishChatUpdate("user-a", "thread-1");
      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).not.toHaveBeenCalled();
    } finally {
      unsubA();
      unsubB();
    }
  });

  test("unsubscribe stops further delivery", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToUserRealtime("user-3", handler);
    publishChatUpdate("user-3", "thread-1");
    unsubscribe();
    publishChatUpdate("user-3", "thread-2");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("supports multiple subscribers per user (e.g. multiple browser tabs)", () => {
    const tabA = vi.fn();
    const tabB = vi.fn();
    const unsubA = subscribeToUserRealtime("user-4", tabA);
    const unsubB = subscribeToUserRealtime("user-4", tabB);
    try {
      publishNotificationsUpdate("user-4");
      expect(tabA).toHaveBeenCalledTimes(1);
      expect(tabB).toHaveBeenCalledTimes(1);
    } finally {
      unsubA();
      unsubB();
    }
  });
});
