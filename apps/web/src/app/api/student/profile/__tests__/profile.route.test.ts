import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, userUpdateMock, profileUpdateMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  userUpdateMock: vi.fn(),
  profileUpdateMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: userUpdateMock },
    studentProfile: { update: profileUpdateMock },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: { update: userUpdateMock },
        studentProfile: { update: profileUpdateMock },
      }),
  },
}));

import { PATCH } from "@/app/api/student/profile/route";

/*
  Learning goals are read by teachers when they plan a lesson, and were only
  ever writable during onboarding. A student whose aim moves from travel to an
  exam has to be able to say so.
*/
function patch(body: unknown) {
  return PATCH(
    new Request("http://localhost/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("PATCH /api/student/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "s-1", role: "STUDENT" } });
  });

  test("saves the goals a student picks", async () => {
    const res = await patch({ learningGoals: ["business", "exam"] });

    expect(res.status).toBe(200);
    expect(profileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { learningGoals: ["business", "exam"] } }),
    );
  });

  test("ignores goals it does not recognise", async () => {
    // The body comes from a browser and lands in a column teachers read.
    await patch({ learningGoals: ["conversation", "nonsense"] });

    expect(profileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { learningGoals: ["conversation"] } }),
    );
  });

  test("accepts clearing them", async () => {
    await patch({ learningGoals: [] });

    expect(profileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { learningGoals: [] } }),
    );
  });

  test("leaves them alone when the field is absent", async () => {
    // The form sends only what it edits; a bio-only save must not wipe them.
    await patch({ shortBio: "Hello" });

    expect(profileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { shortBio: "Hello" } }),
    );
  });

  test("saves a goal written in the student's own words", async () => {
    // The four presets cover the common cases and nothing else: "pass N2 by
    // March" has nowhere to go without this.
    await patch({ learningGoalsNote: "Pass JLPT N2 by March" });

    expect(profileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { learningGoalsNote: "Pass JLPT N2 by March" } }),
    );
  });

  test("stores an emptied note as nothing, not as blank text", async () => {
    await patch({ learningGoalsNote: "   " });

    expect(profileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { learningGoalsNote: null } }),
    );
  });

  test("refuses a note longer than the column", async () => {
    // Better a 400 than a truncated goal the student thinks they saved.
    const res = await patch({ learningGoalsNote: "x".repeat(201) });

    expect(res.status).toBe(400);
  });

  test("still refuses anyone who is not the student", async () => {
    authMock.mockResolvedValue({ user: { id: "t-1", role: "TEACHER" } });

    expect((await patch({ learningGoals: [] })).status).toBe(401);
  });
});
