import { describe, expect, test } from "vitest";
import { POST } from "@/app/api/auth/signup/route";

describe("POST /api/auth/signup", () => {
  test("returns gone because sign-up is Google-only", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email: "student@example.com" }),
      }),
    );

    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toEqual({
      error: "Google sign-in only. Use /auth/signin.",
    });
  });
});
