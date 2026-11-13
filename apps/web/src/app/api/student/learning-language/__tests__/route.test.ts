import { beforeEach, expect, test, vi } from "vitest";

const { authMock, updateMock } = vi.hoisted(() => ({ authMock: vi.fn(), updateMock: vi.fn() }));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: updateMock } } }));
import { PATCH } from "../route";

function change(body: unknown) {
  return PATCH(new Request("http://localhost/api/student/learning-language", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT", locale: "ja", learningLanguage: "ENGLISH" } });
  updateMock.mockImplementation(async ({ data }) => data);
});

test.each(["JAPANESE", "ENGLISH"])("an explicit switch persists %s on this account only", async (learningLanguage) => {
  const response = await change({ learningLanguage });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ learningLanguage });
  expect(updateMock).toHaveBeenCalledExactlyOnceWith({
    where: { id: "student-1" }, data: { learningLanguage }, select: { learningLanguage: true },
  });
});

test.each([{}, { learningLanguage: "ja" }, { learningLanguage: "en" }, { learningLanguage: "JAPANESE", userId: "someone-else" }, { learningLanguage: "JAPANESE", locale: "en" }])("rejects invalid or unrelated account changes: %j", async (body) => {
  expect((await change(body)).status).toBe(400);
  expect(updateMock).not.toHaveBeenCalled();
});

test("signed-out visitors cannot change an account", async () => {
  authMock.mockResolvedValue(null);
  expect((await change({ learningLanguage: "JAPANESE" })).status).toBe(401);
  expect(updateMock).not.toHaveBeenCalled();
});

test.each(["TEACHER", "SUPER_ADMIN"])("%s selection cannot change a learner profile", async (role) => {
  authMock.mockResolvedValue({ user: { id: "staff", role } });
  expect((await change({ learningLanguage: "JAPANESE" })).status).toBe(403);
  expect(updateMock).not.toHaveBeenCalled();
});
