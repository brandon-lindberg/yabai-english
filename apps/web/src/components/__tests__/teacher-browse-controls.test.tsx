// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";

vi.mock("next-intl/server", () => ({
  // The real translator, so ICU plurals and the message files are exercised
  // rather than a stub that would pass whatever the component asked for.
  getTranslations: async (namespace: "booking") =>
    createTranslator({ locale: "en", messages: en, namespace }),
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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/book",
}));

import { TeacherBrowseControls } from "../teacher-browse-controls";

const SIGN_IN = "/auth/signin?callbackUrl=%2Fbook";

async function renderControls(props: Partial<Parameters<typeof TeacherBrowseControls>[0]> = {}) {
  /*
    The provider is for the nested `TeacherFilterBar`, which is a client
    component and reads its copy from context rather than from the server
    translator mocked above.
  */
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Tokyo">
      {await TeacherBrowseControls({
        guest: true,
        count: 12,
        signInHref: SIGN_IN,
        specialty: "",
        language: "",
        ...props,
      })}
    </NextIntlClientProvider>,
  );
}

describe("TeacherBrowseControls", () => {
  test("gives a signed-out visitor no filter fields", async () => {
    /*
      The bug this exists to fix. A guest used to get the same two full-width
      inputs a student does — the largest thing on the page — except `/book`
      strips filter params from a guest before it queries, so typing in them
      narrowed nothing and blurring bounced you to sign-in.
    */
    const { container } = await renderControls({ guest: true });

    expect(container.querySelectorAll("input, select, textarea")).toHaveLength(0);
  });

  test("still gives a signed-in student both filters", async () => {
    const { container } = await renderControls({ guest: false });

    expect(container.querySelectorAll("input")).toHaveLength(2);
    expect(screen.getByLabelText(en.booking.teacherSpecialties)).toBeInTheDocument();
    expect(screen.getByLabelText(en.booking.filterLanguageLabel)).toBeInTheDocument();
  });

  test("tells a guest how many teachers are on the list", async () => {
    await renderControls({ count: 12 });

    expect(screen.getByText("12 teachers")).toBeInTheDocument();
  });

  test("counts one teacher without the plural", async () => {
    await renderControls({ count: 1 });

    expect(screen.getByText("1 teacher")).toBeInTheDocument();
  });

  test("says what signing in buys here, and comes back afterwards", async () => {
    await renderControls();

    expect(screen.getByRole("link", { name: en.booking.guestFilterSignIn })).toHaveAttribute(
      "href",
      SIGN_IN,
    );
  });

  test("says nothing above an empty list", async () => {
    // "0 teachers" directly above "No teachers are listed yet." is the same
    // fact twice. The empty state owns that case.
    const { container } = await renderControls({ count: 0 });

    expect(container).toBeEmptyDOMElement();
  });
});
