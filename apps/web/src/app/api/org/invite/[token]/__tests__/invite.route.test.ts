import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, notifyMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findUnique: vi.fn(), update: vi.fn() },
  },
  notifyMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({ createUserNotification: notifyMock }));

import { GET, POST } from "@/app/api/org/invite/[token]/route";

const token = "abc123";
const routeCtx = { params: Promise.resolve({ token }) };

function getReq() {
  return new Request(`http://localhost/api/org/invite/${token}`);
}

function postReq() {
  return new Request(`http://localhost/api/org/invite/${token}`, {
    method: "POST",
  });
}

describe("GET /api/org/invite/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("404 for invalid token", async () => {
    prismaMock.organizationMembership.findUnique.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  test("410 when already used", async () => {
    prismaMock.organizationMembership.findUnique.mockResolvedValue({
      id: "mem-1", status: "ACTIVE", inviteExpiresAt: null,
    });
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(410);
  });

  test("410 when expired", async () => {
    prismaMock.organizationMembership.findUnique.mockResolvedValue({
      id: "mem-1", status: "INVITED",
      inviteExpiresAt: new Date("2020-01-01"),
    });
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(410);
  });

  test("200 returns invite info", async () => {
    prismaMock.organizationMembership.findUnique.mockResolvedValue({
      id: "mem-1", status: "INVITED", orgRole: "TEACHER",
      inviteExpiresAt: new Date("2099-01-01"),
      inviteEmail: "t@test.com",
      organization: { id: "org-1", name: "Test Org", slug: "test-org" },
      school: { id: "s1", name: "School 1", slug: "school-1" },
    });
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invite.organization.name).toBe("Test Org");
    expect(body.invite.orgRole).toBe("TEACHER");
  });
});

describe("POST /api/org/invite/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(postReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  test("200 accepts invite", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findUnique.mockResolvedValue({
      id: "mem-1", status: "INVITED", userId: "u-placeholder",
      inviteExpiresAt: new Date("2099-01-01"),
    });
    prismaMock.organizationMembership.update.mockResolvedValue({
      id: "mem-1", status: "ACTIVE", userId: "u1",
    });
    const res = await POST(postReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership.status).toBe("ACTIVE");
  });

  test("notifies inviter on acceptance", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", name: "Acceptor" } });
    prismaMock.organizationMembership.findUnique.mockResolvedValue({
      id: "mem-1", status: "INVITED", userId: "u-placeholder",
      inviteExpiresAt: new Date("2099-01-01"),
      invitedByUserId: "inviter-1",
      organization: { name: "Acme Org" },
    });
    prismaMock.organizationMembership.update.mockResolvedValue({
      id: "mem-1", status: "ACTIVE", userId: "u1",
    });
    await POST(postReq(), routeCtx);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "inviter-1" }),
    );
  });

  test("does not notify when self-accepting (inviter is acceptor)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findUnique.mockResolvedValue({
      id: "mem-1", status: "INVITED", userId: "u-placeholder",
      inviteExpiresAt: new Date("2099-01-01"),
      invitedByUserId: "u1",
      organization: { name: "Acme Org" },
    });
    prismaMock.organizationMembership.update.mockResolvedValue({
      id: "mem-1", status: "ACTIVE", userId: "u1",
    });
    await POST(postReq(), routeCtx);
    expect(notifyMock).not.toHaveBeenCalled();
  });
});
