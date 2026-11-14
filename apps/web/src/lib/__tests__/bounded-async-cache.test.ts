import { expect, test, vi } from "vitest";
import { createBoundedAsyncCache } from "../bounded-async-cache";

test("coalesces overlapping immutable loads and scopes them to their database owner", async () => {
  const cache = createBoundedAsyncCache<object>(2), owner = {};
  let release!: (value: object) => void;
  const load = vi.fn(() => new Promise<object>(resolve => { release = resolve; }));
  const first = cache(owner, "version-one", load), second = cache(owner, "version-one", load);
  await Promise.resolve();
  expect(load).toHaveBeenCalledTimes(1);
  const value = { validated: true }; release(value);
  expect(await first).toBe(value); expect(await second).toBe(value);
  expect(await cache(owner, "version-one", load)).toBe(value);
  const other = { validated: true };
  expect(await cache({}, "version-one", async () => other)).toBe(other);
});

test("evicts least recently used versions and retries failed validation instead of retaining it", async () => {
  const cache = createBoundedAsyncCache<string>(2), owner = {}, load = vi.fn(async () => "valid");
  await cache(owner, "one", load); await cache(owner, "two", load);
  await cache(owner, "one", load); await cache(owner, "three", load);
  await cache(owner, "one", load);
  expect(load).toHaveBeenCalledTimes(3);
  await cache(owner, "two", load);
  expect(load).toHaveBeenCalledTimes(4);
  await expect(cache(owner, "bad", async () => { throw new Error("invalid snapshot"); })).rejects.toThrow("invalid snapshot");
  expect(await cache(owner, "bad", load)).toBe("valid");
});

test("an evicted failing load cannot remove its newer replacement", async () => {
  const cache = createBoundedAsyncCache<string>(1), owner = {};
  let reject!: (error: Error) => void;
  const pending = cache(owner, "one", () => new Promise<string>((_, fail) => { reject = fail; }));
  const failure = expect(pending).rejects.toThrow("old load");
  await cache(owner, "two", async () => "two");
  await cache(owner, "one", async () => "replacement");
  reject(new Error("old load")); await failure;
  expect(await cache(owner, "one", async () => "unexpected reload")).toBe("replacement");
});
