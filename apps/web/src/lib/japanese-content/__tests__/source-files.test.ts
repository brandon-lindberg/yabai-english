import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import sourceLock from "../../../../data/japanese-content/source-lock.json";
import { fetchPinnedSources, parseSourceLock, readPinnedSource, type PinnedSource } from "../source-files";

const directories: string[] = [];
async function cache() {
  const directory = await mkdtemp(join(tmpdir(), "mirror-sources-"));
  directories.push(directory);
  return directory;
}
function source(content = "source data"): PinnedSource {
  return {
    id: "test-source", role: "metadata", filename: "test.json",
    url: "https://raw.githubusercontent.com/example/data/pinned/test.json",
    integrity: { algorithm: "sha256", digest: createHash("sha256").update(content).digest("hex") },
    source: "https://github.com/example/data", license: "CC-BY-SA-4.0",
  };
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("source lock", () => {
  it("pins complete N5–N1 files and full dictionary archives", () => {
    const lock = parseSourceLock(sourceLock);
    expect(lock.files.filter((file) => file.role === "vocab")).toHaveLength(5);
    expect(lock.files.filter((file) => file.role === "kanji")).toHaveLength(5);
    expect(lock.files.filter((file) => file.role === "reference")).toHaveLength(5);
    expect(lock.files.some((file) => file.role === "jmdict" && !file.filename.includes("common"))).toBe(true);
  });

  it("rejects a missing level instead of downloading a partial corpus", () => {
    expect(() => parseSourceLock({ ...sourceLock, files: sourceLock.files.filter((file) => file.id !== "openjlpt-data-json-vocab-n1.json") })).toThrow(/N1/);
  });

  it("rejects colliding cache names and paths outside the cache", () => {
    const files = sourceLock.files.map((file) => ({ ...file }));
    files[1].filename = files[0].filename;
    expect(() => parseSourceLock({ ...sourceLock, files })).toThrow(/filename/i);
    files[0].filename = "../outside.json";
    expect(() => parseSourceLock({ ...sourceLock, files })).toThrow();
  });
});

describe("verified source cache", () => {
  it("reads a valid cached file without fetching", async () => {
    const directory = await cache();
    await writeFile(join(directory, "test.json"), "source data");
    expect(await readPinnedSource(source(), directory)).toBe("source data");
  });

  it("rejects a modified cache on both offline reads and fetch runs", async () => {
    const directory = await cache();
    await writeFile(join(directory, "test.json"), "corrupt");
    const fetcher = vi.fn<typeof fetch>();
    await expect(readPinnedSource(source(), directory)).rejects.toThrow(/integrity/i);
    await expect(fetchPinnedSources([source()], directory, fetcher)).rejects.toThrow(/integrity/i);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("saves only checksum-verified downloads and reuses them", async () => {
    const directory = await cache();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("source data"));
    await fetchPinnedSources([source()], directory, fetcher);
    await fetchPinnedSources([source()], directory, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await readFile(join(directory, "test.json"), "utf8")).toBe("source data");
  });

  it("does not cache a bad download or an HTTP failure", async () => {
    const directory = await cache();
    await expect(fetchPinnedSources([source()], directory, vi.fn<typeof fetch>().mockResolvedValue(new Response("wrong")))).rejects.toThrow(/integrity/i);
    await expect(readFile(join(directory, "test.json"))).rejects.toThrow();
    await expect(fetchPinnedSources([source()], directory, vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status: 503 })))).rejects.toThrow(/503/);
  });
});
