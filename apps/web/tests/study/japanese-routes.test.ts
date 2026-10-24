import { beforeEach, expect, it, vi } from "vitest";
import { JapaneseStudyFailure } from "@/lib/study/japanese-service";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), db: {}, queue: vi.fn(), review: vi.fn(), overview: vi.fn(), quick: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/lib/study/japanese-service", async original => ({
  ...await original<typeof import("@/lib/study/japanese-service")>(),
  createJapaneseStudyQueue: mocks.queue, submitJapaneseStudyReview: mocks.review, getJapaneseStudyOverview: mocks.overview, createJapaneseQuickReviewQueue: mocks.quick,
}));
import { POST as quick } from "@/app/api/japanese-study/quick-review/route";
import { GET as overview } from "@/app/api/japanese-study/route";
import { POST as queue } from "@/app/api/japanese-study/queue/route";
import { POST as review } from "@/app/api/japanese-study/reviews/route";

const request = (body?: unknown, headers = {}) => new Request("http://localhost/api/japanese-study/queue", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "signed-in-actor", role: "SUPER_ADMIN", learningLanguage: "ENGLISH" } });
  mocks.queue.mockResolvedValue({ cards: [] }); mocks.review.mockResolvedValue({ correct: true }); mocks.overview.mockResolvedValue({ levels: [] });
});

it("uses authenticated identity and leaves fresh role/subject checks to the service", async () => {
  await overview(new Request("http://localhost/api/japanese-study"));
  await queue(request({ levelCode: "N5" }));
  await review(request({ promptId: "opaque-prompt", choiceId: "opaque-choice" }));
  expect(mocks.overview).toHaveBeenCalledWith(mocks.db, "signed-in-actor");
  expect(mocks.queue).toHaveBeenCalledWith(mocks.db, "signed-in-actor", { levelCode: "N5" });
  expect(mocks.review).toHaveBeenCalledWith(mocks.db, "signed-in-actor", { promptId: "opaque-prompt", choiceId: "opaque-choice" });
});

it("denies guests, cross-origin writes, non-JSON and oversized requests before persistence", async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await queue(request({ levelCode: "N5" }))).status).toBe(401);
  mocks.auth.mockResolvedValue({ user: { id: "signed-in-actor" } });
  expect((await queue(request({}, { Origin: "https://unrelated.example" }))).status).toBe(403);
  expect((await review(request({}, { "Sec-Fetch-Site": "cross-site" }))).status).toBe(403);
  expect((await review(request({}, { "Content-Type": "text/plain" }))).status).toBe(415);
  expect((await queue(request({ extra: "x".repeat(20_000) }))).status).toBe(413);
  expect((await queue(new Request("http://localhost/api/japanese-study/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status).toBe(400);
  expect(mocks.queue).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled();
});

it("returns safe errors and private no-store headers", async () => {
  mocks.review.mockRejectedValue(new JapaneseStudyFailure(409, "REVIEW_CONFLICT"));
  const response = await review(request({}));
  expect(response.status).toBe(409);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ error: "REVIEW_CONFLICT" });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.review.mockRejectedValue(new Error("private internals"));
  expect(await (await review(request({}))).json()).toEqual({ error: "INTERNAL_ERROR" });
  log.mockRestore();
});

it("daily quick review shares authenticated bounded JSON handling", async () => {
  mocks.quick.mockResolvedValue({ cards: [], total: 0 });
  expect((await quick(request({}))).status).toBe(200);
  expect(mocks.quick).toHaveBeenCalledWith(mocks.db, "signed-in-actor", {});
  expect((await quick(request({}, { Origin: "https://another.example" }))).status).toBe(403);
});
