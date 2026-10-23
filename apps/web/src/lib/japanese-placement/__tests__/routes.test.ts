import { beforeEach, expect, test, vi } from "vitest";
import { JapanesePlacementFailure } from "../service";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), db: {}, start: vi.fn(), current: vi.fn(), get: vi.fn(), submit: vi.fn(), teacher: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("../service", async (original) => ({
  ...await original<typeof import("../service")>(),
  startStoredJapaneseAttempt: mocks.start, getCurrentJapaneseAttempt: mocks.current,
  getStoredJapaneseAttempt: mocks.get, submitStoredJapaneseResponse: mocks.submit, getTeacherJapaneseResult: mocks.teacher,
}));
import { GET as current, POST as start } from "@/app/api/japanese-placement/attempts/route";
import { GET as get } from "@/app/api/japanese-placement/attempts/[attemptId]/route";
import { POST as submit } from "@/app/api/japanese-placement/attempts/[attemptId]/responses/route";
import { GET as teacher } from "@/app/api/teacher/students/[studentId]/japanese-placement/route";

const requestId = "00000000-0000-4000-8000-000000000001";
const response = { kind: "answer", itemId: "kana-one", choiceId: "a" };
const attempt = { params: Promise.resolve({ attemptId: "attempt-one" }) };
const student = { params: Promise.resolve({ studentId: "student-one" }) };
const request = (method = "GET", body?: unknown, headers: Record<string, string> = {}) => new Request("http://localhost/api/japanese-placement/attempts", {
  method, headers: { "Content-Type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "actor-one", role: "SUPER_ADMIN", learningLanguage: "ENGLISH" } });
  for (const mock of [mocks.start, mocks.get, mocks.submit]) mock.mockResolvedValue({ attemptId: "attempt-one", question: null });
  mocks.current.mockResolvedValue(null);
  mocks.teacher.mockResolvedValue({ result: null });
});

test("all route adapters use authenticated identity, leaving fresh role/subject checks to the service", async () => {
  expect((await start(request("POST", { requestId }))).status).toBe(200);
  expect(mocks.start).toHaveBeenCalledWith(mocks.db, "actor-one", { requestId });
  expect(await (await current(request())).json()).toEqual({ attempt: null });
  expect(mocks.current).toHaveBeenCalledWith(mocks.db, "actor-one");
  await get(request(), attempt);
  expect(mocks.get).toHaveBeenCalledWith(mocks.db, "actor-one", "attempt-one");
  await submit(request("POST", response), attempt);
  expect(mocks.submit).toHaveBeenCalledWith(mocks.db, "actor-one", "attempt-one", response);
  await teacher(request(), student);
  expect(mocks.teacher).toHaveBeenCalledWith(mocks.db, "actor-one", "student-one");
});

test("anonymous requests never reach persistence", async () => {
  mocks.auth.mockResolvedValue(null);
  for (const result of await Promise.all([
    start(request("POST", { requestId })), current(request()), get(request(), attempt),
    submit(request("POST", response), attempt), teacher(request(), student),
  ])) expect(result.status).toBe(401);
  for (const mock of [mocks.start, mocks.current, mocks.get, mocks.submit, mocks.teacher]) expect(mock).not.toHaveBeenCalled();
});

test("mutations reject cross-site requests and non-JSON content", async () => {
  expect((await start(request("POST", { requestId }, { Origin: "https://unrelated.example" }))).status).toBe(403);
  expect((await start(request("POST", { requestId }, { "Sec-Fetch-Site": "cross-site" }))).status).toBe(403);
  expect((await start(request("POST", { requestId }, { "Content-Type": "text/plain" }))).status).toBe(415);
  expect(mocks.start).not.toHaveBeenCalled();
  expect((await start(request("POST", { requestId }, { Origin: "http://localhost" }))).status).toBe(200);
});

test("bad or oversized JSON cannot reach persistence", async () => {
  const invalid = new Request("http://localhost/api/japanese-placement/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  expect((await start(invalid)).status).toBe(400);
  expect((await start(request("POST", { requestId, extra: "x".repeat(20_000) }))).status).toBe(413);
  expect(mocks.start).not.toHaveBeenCalled();
});

test.each([403, 404, 409, 503])("returns safe service failure %s without caching student information", async (status) => {
  mocks.get.mockRejectedValue(new JapanesePlacementFailure(status, "SAFE_CODE"));
  const result = await get(request(), attempt);
  expect(result.status).toBe(status);
  expect(await result.json()).toEqual({ error: "SAFE_CODE" });
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
});

test("internal errors do not expose their messages", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.get.mockRejectedValue(new Error("Private database detail"));
  const result = await get(request(), attempt);
  expect(result.status).toBe(500);
  expect(await result.json()).toEqual({ error: "INTERNAL_ERROR" });
  log.mockRestore();
});
