import { describe, expect, test } from "vitest";
import { REALTIME_EVENTS, userRoom } from "@/lib/realtime-events";

describe("realtime event conventions", () => {
  test("uses stable user room naming", () => {
    expect(userRoom("u_123")).toBe("user:u_123");
  });

  test("exposes supported app events", () => {
    expect(REALTIME_EVENTS.CHAT_UPDATE).toBe("chat:update");
    expect(REALTIME_EVENTS.NOTIFICATIONS_UPDATE).toBe("notifications:update");
  });
});
