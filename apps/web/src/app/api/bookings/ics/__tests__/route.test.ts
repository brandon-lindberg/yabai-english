import { beforeEach, expect, test, vi } from "vitest";
import { conversationProduct, lessonSubjectCases } from "../../../../../../test/lesson-subject-fixture";
const { authMock, findMany } = vi.hoisted(() => ({ authMock: vi.fn(), findMany: vi.fn() }));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { booking: { findMany } } }));
import { GET } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "student", learningLanguage: "JAPANESE" } });
});
test("calendar downloads retain both historical subjects rather than the current learning preference", async () => {
  findMany.mockResolvedValue(lessonSubjectCases.map(({ learningLanguage }) => ({ id: learningLanguage, learningLanguage, lessonProduct: conversationProduct,
    teacher: { user: { name: "Teacher" } }, startsAt: new Date("2026-11-01T00:00:00Z"), endsAt: new Date("2026-11-01T01:00:00Z"), meetUrl: null })));
  const res = await GET(new Request("http://localhost/api/bookings/ics"));
  const body = await res.text();
  expect(res.status).toBe(200);
  for (const { nameEn, nameJa } of lessonSubjectCases) expect(body).toContain(`SUMMARY:${nameEn} (${nameJa})`);
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ studentId: "student" }) }));
  expect(findMany.mock.calls[0][0].where).not.toHaveProperty("learningLanguage");
});
