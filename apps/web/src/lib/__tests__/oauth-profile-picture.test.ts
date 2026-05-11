import { describe, expect, test, vi } from "vitest";
import { pickOidcProfilePicture, syncUserImageIfChanged } from "../oauth-profile-picture";

describe("pickOidcProfilePicture", () => {
  test("returns null for non-objects", () => {
    expect(pickOidcProfilePicture(null)).toBeNull();
    expect(pickOidcProfilePicture(undefined)).toBeNull();
    expect(pickOidcProfilePicture("x")).toBeNull();
    expect(pickOidcProfilePicture(1)).toBeNull();
  });

  test("reads OIDC picture claim", () => {
    expect(pickOidcProfilePicture({ picture: " https://example.com/a.png " })).toBe(
      "https://example.com/a.png",
    );
  });

  test("falls back to image when picture is absent", () => {
    expect(pickOidcProfilePicture({ image: "https://cdn.example/face.jpg" })).toBe(
      "https://cdn.example/face.jpg",
    );
  });

  test("prefers picture over image when both exist", () => {
    expect(
      pickOidcProfilePicture({
        picture: "https://a",
        image: "https://b",
      }),
    ).toBe("https://a");
  });

  test("returns null for empty or non-string values", () => {
    expect(pickOidcProfilePicture({ picture: "" })).toBeNull();
    expect(pickOidcProfilePicture({ picture: "   " })).toBeNull();
    expect(pickOidcProfilePicture({ picture: 42 })).toBeNull();
  });
});

describe("syncUserImageIfChanged", () => {
  test("no-ops when picture URL is null", async () => {
    const findUnique = vi.fn();
    const update = vi.fn();
    await syncUserImageIfChanged({ user: { findUnique, update } } as never, "u1", null);
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  test("no-ops when stored image already matches", async () => {
    const findUnique = vi.fn().mockResolvedValue({ image: "https://same" });
    const update = vi.fn();
    await syncUserImageIfChanged({ user: { findUnique, update } } as never, "u1", "https://same");
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { image: true },
    });
    expect(update).not.toHaveBeenCalled();
  });

  test("updates when URL differs", async () => {
    const findUnique = vi.fn().mockResolvedValue({ image: "https://old" });
    const update = vi.fn().mockResolvedValue({});
    await syncUserImageIfChanged({ user: { findUnique, update } } as never, "u1", "https://new");
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { image: "https://new" },
    });
  });

  test("updates when previous image was null", async () => {
    const findUnique = vi.fn().mockResolvedValue({ image: null });
    const update = vi.fn().mockResolvedValue({});
    await syncUserImageIfChanged({ user: { findUnique, update } } as never, "u1", "https://new");
    expect(update).toHaveBeenCalledTimes(1);
  });
});
