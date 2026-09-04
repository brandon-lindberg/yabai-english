import { describe, expect, it } from "vitest";
import { getHeaderPrimaryNavLinks } from "../header-nav-links";

describe("getHeaderPrimaryNavLinks", () => {
  it("returns book link for guests", () => {
    expect(getHeaderPrimaryNavLinks({ signedIn: false, role: "STUDENT" })).toEqual([
      { id: "book", href: "/book", labelKey: "book" },
      { id: "become-teacher", href: "/become-a-teacher", labelKey: "becomeTeacher" },
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

  it("returns admin dashboard, schedule, and admin", () => {
    expect(
      getHeaderPrimaryNavLinks({ signedIn: true, role: "SUPER_ADMIN" }).map((l) => l.id),
    ).toEqual(["dashboard", "schedule", "admin"]);
  });
});

describe("becoming a teacher", () => {
  /*
    Teaching here is by invitation, so the page explaining that is for people
    who have not signed up. It was in the footer of every page, which put it in
    front of the students and teachers it has nothing to say to.
  */
  it("is offered to a visitor who has not signed in", () => {
    const links = getHeaderPrimaryNavLinks({ signedIn: false, role: undefined });

    expect(links.map((l) => l.href)).toContain("/become-a-teacher");
  });

  it("is not offered to a student", () => {
    const links = getHeaderPrimaryNavLinks({ signedIn: true, role: "STUDENT" });

    expect(links.map((l) => l.href)).not.toContain("/become-a-teacher");
  });

  it("is not offered to a teacher, who plainly got in", () => {
    const links = getHeaderPrimaryNavLinks({ signedIn: true, role: "TEACHER" });

    expect(links.map((l) => l.href)).not.toContain("/become-a-teacher");
  });

  it("still offers a visitor the teacher list", () => {
    const links = getHeaderPrimaryNavLinks({ signedIn: false, role: undefined });

    expect(links.map((l) => l.href)).toContain("/book");
  });
});

