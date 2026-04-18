import { describe, expect, it } from "vitest";
import { getHeaderPrimaryNavLinks } from "../header-nav-links";

describe("getHeaderPrimaryNavLinks", () => {
  it("returns book link for guests", () => {
    expect(getHeaderPrimaryNavLinks({ signedIn: false, role: "STUDENT" })).toEqual([
      { id: "book", href: "/book", labelKey: "book" },
    ]);
  });

  it("returns empty when signed in but role missing", () => {
    expect(getHeaderPrimaryNavLinks({ signedIn: true, role: null })).toEqual([]);
  });

  it("returns student links including book and schedule", () => {
    const links = getHeaderPrimaryNavLinks({
      signedIn: true,
      role: "STUDENT",
      canStartPlacement: false,
    });
    expect(links.map((l) => l.id)).toEqual(["dashboard", "book", "learn", "schedule"]);
    expect(links.find((l) => l.id === "book")?.href).toBe("/book");
  });

  it("adds placement for students when canStartPlacement", () => {
    const links = getHeaderPrimaryNavLinks({
      signedIn: true,
      role: "STUDENT",
      canStartPlacement: true,
    });
    expect(links.map((l) => l.id)).toEqual([
      "dashboard",
      "book",
      "learn",
      "schedule",
      "placement",
    ]);
  });

  it("returns teacher dashboard and schedule only", () => {
    expect(
      getHeaderPrimaryNavLinks({ signedIn: true, role: "TEACHER" }).map((l) => l.id),
    ).toEqual(["dashboard", "schedule"]);
  });

  it("returns admin dashboard and admin", () => {
    expect(
      getHeaderPrimaryNavLinks({ signedIn: true, role: "ADMIN" }).map((l) => l.id),
    ).toEqual(["dashboard", "admin"]);
  });
});
