import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, test, vi } from "vitest";

/*
  The service worker is plain JS in `public/`, outside the bundle, so it is
  loaded here into a sandbox with the worker globals stubbed.

  It earns a test because its failure mode is invisible and long-lived: the
  previous version returned a cached asset and never refetched it, so a stale
  chunk was served indefinitely. That is not a bug you notice — it is one you
  eventually trace back through months of confusing network traffic.
*/

const SW_SOURCE = readFileSync(
  path.resolve(__dirname, "../../../public/sw.js"),
  "utf8",
);

type Listeners = Record<string, (event: unknown) => void>;

function makeResponse(body: string, init: { ok?: boolean; type?: string } = {}) {
  return {
    body,
    ok: init.ok ?? true,
    type: init.type ?? "basic",
    clone() {
      return makeResponse(body, init);
    },
  };
}

function loadServiceWorker({
  cached = null,
  networkResponse = makeResponse("fresh"),
  networkFails = false,
}: {
  cached?: ReturnType<typeof makeResponse> | null;
  networkResponse?: ReturnType<typeof makeResponse>;
  networkFails?: boolean;
} = {}) {
  const listeners: Listeners = {};
  const put = vi.fn().mockResolvedValue(undefined);
  const deleted: string[] = [];

  const fetchMock = vi.fn(() =>
    networkFails ? Promise.reject(new Error("offline")) : Promise.resolve(networkResponse),
  );

  const caches = {
    open: vi.fn().mockResolvedValue({ put, match: vi.fn().mockResolvedValue(cached) }),
    match: vi.fn().mockResolvedValue(cached),
    keys: vi.fn().mockResolvedValue(["english-studio-v1", "english-studio-v2"]),
    delete: vi.fn((key: string) => {
      deleted.push(key);
      return Promise.resolve(true);
    }),
  };

  const self = {
    addEventListener: (name: string, fn: (event: unknown) => void) => {
      listeners[name] = fn;
    },
    location: { origin: "https://example.test" },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };

  vm.runInNewContext(SW_SOURCE, {
    self,
    caches,
    fetch: fetchMock,
    URL,
    Promise,
    console,
  });

  return { listeners, put, caches, fetchMock, deleted };
}

function fetchEvent(url: string, { mode = "no-cors", method = "GET" } = {}) {
  let responded: unknown;
  const waited: Promise<unknown>[] = [];
  return {
    event: {
      request: { url, method, mode },
      respondWith: (p: unknown) => {
        responded = p;
      },
      waitUntil: (p: Promise<unknown>) => {
        waited.push(p);
      },
    },
    getResponse: () => responded,
    waited,
  };
}

const ASSET = "https://example.test/_next/static/chunks/main.js";

describe("service worker asset caching", () => {
  let sw: ReturnType<typeof loadServiceWorker>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("revalidates even when the asset is already cached", async () => {
    // The whole bug: the old worker returned the cached copy and stopped there,
    // so a stale chunk was pinned for as long as the cache survived.
    sw = loadServiceWorker({ cached: makeResponse("stale") });
    const { event, getResponse } = fetchEvent(ASSET);

    sw.listeners.fetch(event);

    expect(sw.fetchMock).toHaveBeenCalledTimes(1);
    expect(await getResponse()).toMatchObject({ body: "stale" });
  });

  test("serves the cached copy immediately rather than waiting on the network", async () => {
    sw = loadServiceWorker({ cached: makeResponse("stale") });
    const { event, getResponse } = fetchEvent(ASSET);

    sw.listeners.fetch(event);

    // Cached wins the response; the fresh copy only lands in the cache.
    expect(await getResponse()).toMatchObject({ body: "stale" });
  });

  test("stores the refreshed copy so the next load is current", async () => {
    sw = loadServiceWorker({ cached: makeResponse("stale") });
    const { event, waited } = fetchEvent(ASSET);

    sw.listeners.fetch(event);
    await Promise.all(waited);

    expect(sw.put).toHaveBeenCalledTimes(1);
  });

  test("falls back to the network when nothing is cached", async () => {
    sw = loadServiceWorker({ cached: null });
    const { event, getResponse } = fetchEvent(ASSET);

    sw.listeners.fetch(event);

    expect(await getResponse()).toMatchObject({ body: "fresh" });
  });

  test("never caches a failed response", async () => {
    // A cached 404 would be served forever, exactly like a stale chunk.
    sw = loadServiceWorker({ cached: null, networkResponse: makeResponse("nope", { ok: false }) });
    const { event, waited } = fetchEvent(ASSET);

    sw.listeners.fetch(event);
    await Promise.all(waited);

    expect(sw.put).not.toHaveBeenCalled();
  });

  test("never caches an opaque cross-origin response", async () => {
    sw = loadServiceWorker({
      cached: null,
      networkResponse: makeResponse("opaque", { type: "opaque" }),
    });
    const { event, waited } = fetchEvent(ASSET);

    sw.listeners.fetch(event);
    await Promise.all(waited);

    expect(sw.put).not.toHaveBeenCalled();
  });

  test("still answers from cache when the network is down", async () => {
    sw = loadServiceWorker({ cached: makeResponse("stale"), networkFails: true });
    const { event, getResponse, waited } = fetchEvent(ASSET);

    sw.listeners.fetch(event);
    await Promise.all(waited);

    expect(await getResponse()).toMatchObject({ body: "stale" });
  });

  test("leaves API and auth traffic alone", () => {
    sw = loadServiceWorker({ cached: makeResponse("stale") });

    for (const url of [
      "https://example.test/api/auth/session",
      "https://example.test/auth/signin",
    ]) {
      const { event, getResponse } = fetchEvent(url, { mode: "cors" });
      sw.listeners.fetch(event);
      expect(getResponse()).toBeUndefined();
    }
    expect(sw.fetchMock).not.toHaveBeenCalled();
  });

  test("evicts caches from earlier versions on activate", async () => {
    sw = loadServiceWorker();
    const waited: Promise<unknown>[] = [];

    sw.listeners.activate({ waitUntil: (p: Promise<unknown>) => waited.push(p) });
    await Promise.all(waited);

    // v1 is the cache that held the never-revalidated assets.
    expect(sw.deleted).toEqual(["english-studio-v1"]);
  });
});
