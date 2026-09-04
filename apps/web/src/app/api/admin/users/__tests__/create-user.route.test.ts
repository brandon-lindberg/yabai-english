import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, findFirstMock, createMock, provisionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  provisionMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin/provision-role-profile", () => ({ provisionRoleProfile: provisionMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: findFirstMock, create: createMock },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ user: { create: createMock } }),
  },
}));

import { POST } from "@/app/api/admin/users/route";

/*
  There is no application flow: a teacher is invited, and until now that meant
  waiting for them to sign up as a student so an admin could change the column
  afterwards. This creates the account with the role already on it, so the
  first thing they see after signing in is their own dashboard.

  It works because the Google provider links an OAuth account to an existing
  user with the same address, and the sign-in callback looks that user up by
  email and leaves a teacher's role alone.
*/
function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "a-1", role: "SUPER_ADMIN" } });
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "u-new", email: "t@example.com", role: "TEACHER" });
  });

  test("creates a teacher who has never signed in", async () => {
    const res = await post({ email: "t@example.com", name: "Mika", role: "TEACHER" });

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "t@example.com", role: "TEACHER" }),
      }),
    );
  });

  test("gives them the profile the role needs", async () => {
    await post({ email: "t@example.com", role: "TEACHER" });

    expect(provisionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "u-new", role: "TEACHER" }),
    );
  });

  test("stores the address the way sign-in will look it up", async () => {
    // Auth.js matches on the address Google returns. A stored `T@Example.com `
    // would never be found, and the invitee would get a fresh student account.
    await post({ email: "  T@Example.COM  ", role: "TEACHER" });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "t@example.com" }) }),
    );
  });

  test("refuses an address that already exists", async () => {
    findFirstMock.mockResolvedValue({ id: "u-1" });

    const res = await post({ email: "t@example.com", role: "TEACHER" });

    expect(res.status).toBe(409);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("will not mint an administrator", async () => {
    // Promoting an existing, known account is a deliberate act with a record.
    // Typing an address into a box is not the same thing.
    const res = await post({ email: "t@example.com", role: "SUPER_ADMIN" });

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("refuses anyone who is not an administrator", async () => {
    authMock.mockResolvedValue({ user: { id: "t-1", role: "TEACHER" } });

    expect((await post({ email: "x@example.com", role: "TEACHER" })).status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("refuses a signed-out request", async () => {
    authMock.mockResolvedValue(null);

    expect((await post({ email: "x@example.com", role: "TEACHER" })).status).toBe(401);
  });

  test("refuses a body without an address", async () => {
    expect((await post({ role: "TEACHER" })).status).toBe(400);
  });
});
