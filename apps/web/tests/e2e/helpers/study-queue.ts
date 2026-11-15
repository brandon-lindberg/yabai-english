import { expect, type Page } from "@playwright/test";
import { QUEUE_STREAM_TYPE, readPreparedQueue } from "../../../src/lib/study/queue-preparation";

type CapturedQueue = { status?: number; contentType?: string; body?: string; error?: string };
type QueueWindow = Window & { mirrorQueueCapture?: CapturedQueue };

/** Observe a clone of the real streamed response before the UI consumes it.
 * Chromium may discard its protocol response body when the UI's reader cancels
 * after `ready`. The original response still reaches the UI without buffering,
 * replacement data, or a second queue request. Each test owns and closes its page.
 */
export async function captureStudyQueue(page: Page, pathname: string, method: "GET" | "POST") {
  await page.addInitScript(({ pathname, method }) => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      const matches = url.origin === location.origin && url.pathname === pathname
        && (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase() === method;
      if (!matches) return original(input, init);
      const captured: CapturedQueue = {};
      (window as QueueWindow).mirrorQueueCapture = captured;
      try {
        const response = await original(input, init);
        captured.status = response.status;
        captured.contentType = response.headers.get("Content-Type") ?? "";
        void response.clone().text().then(body => { captured.body = body; }, error => { captured.error = String(error); });
        return response;
      } catch (error) { captured.error = String(error); throw error; }
    };
  }, { pathname, method });
  return async () => {
    await page.waitForFunction(() => {
      const captured = (window as QueueWindow).mirrorQueueCapture;
      return captured && (captured.body !== undefined || captured.error !== undefined);
    });
    const captured = await page.evaluate(() => (window as QueueWindow).mirrorQueueCapture!);
    expect(captured.error).toBeUndefined();
    expect(captured.status).toBe(200);
    expect(captured.contentType).toContain(QUEUE_STREAM_TYPE);
    const progress: number[] = [];
    const data = await readPreparedQueue(new Response(captured.body!, {
      status: captured.status!, headers: { "Content-Type": captured.contentType! },
    }), value => progress.push(value.completed / value.total));
    expect(progress.at(-1)).toBe(1);
    expect(progress.some(value => value < 1)).toBe(true);
    return data;
  };
}
