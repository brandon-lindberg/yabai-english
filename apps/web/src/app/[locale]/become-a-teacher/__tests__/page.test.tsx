// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../../messages/en.json";
import BecomeATeacherPage from "@/app/[locale]/become-a-teacher/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => {
    const messages = en.becomeTeacher as Record<string, string>;
    return (key: string) => messages[key] ?? key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

/*
  The people this page is for do not have an account — that is the whole
  premise — so it must render for a visitor with no session, and it must say
  the closed thing plainly rather than implying a door that is not there.
*/

async function renderPage() {
  return render(await BecomeATeacherPage());
}

describe("Become a teacher", () => {
  test("says applications are not open", async () => {
    await renderPage();

    expect(screen.getByText(en.becomeTeacher.statusTitle)).toBeInTheDocument();
    expect(screen.getByText(en.becomeTeacher.statusBody)).toBeInTheDocument();
  });

  test("offers no way to apply, because there is none", async () => {
    // A form or a waiting list here would collect hope the platform cannot
    // honour. The only routes off this page are signing in and asking.
    const { container } = await renderPage();

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelectorAll("input, textarea")).toHaveLength(0);
  });

  test("gives a reason to come back", async () => {
    // The point of the page beyond the refusal: applications will open, and
    // this is where it gets announced.
    await renderPage();

    expect(screen.getByText(en.becomeTeacher.nextBody)).toBeInTheDocument();
  });

  test("leaves a way to ask", async () => {
    await renderPage();

    expect(
      screen.getByRole("link", { name: en.becomeTeacher.questionsCta }),
    ).toHaveAttribute("href", "/contact");
  });

  test("reads no session, so a signed-out visitor sees it", async () => {
    /*
      Structural rather than behavioural: every private page in this app gates
      itself by calling `auth()` and returning nothing. This one must never
      grow that call, and the render above would not catch it being added
      behind a mock.
    */
    const source = readFileSync(
      resolve(process.cwd(), "src/app/[locale]/become-a-teacher/page.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/from "@\/auth"/);
    expect(source).not.toMatch(/\bauth\(\)/);
  });
});
