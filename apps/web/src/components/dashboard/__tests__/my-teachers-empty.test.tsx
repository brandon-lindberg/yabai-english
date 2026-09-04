// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { MyTeachersEmpty } from "@/components/dashboard/my-teachers-empty";

/**
 * `getTranslations` needs a request context this component never gets in a
 * test, so it is served from the real message file instead — the strings under
 * assertion are the ones that ship.
 */
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const messages = (namespace === "common"
      ? en.common
      : en.dashboard.myTeachersPage) as Record<string, string>;
    return (key: string) => messages[key] ?? key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/*
  A student with no teachers yet was told only that they had none. The one
  thing they could do about it — find a teacher — was somewhere else entirely,
  so the page named a dead end and left them to work out the way on.
*/

// Awaited rather than mounted: it is a server component, so it resolves to
// plain elements. Keeping it one means this empty state ships no client JS.
async function renderEmpty() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {await MyTeachersEmpty()}
    </NextIntlClientProvider>,
  );
}

describe("MyTeachersEmpty", () => {
  test("says there are none yet", async () => {
    await renderEmpty();

    expect(screen.getByText(en.dashboard.myTeachersPage.empty)).toBeInTheDocument();
  });

  test("offers the way out of the empty state", async () => {
    await renderEmpty();

    expect(screen.getByRole("link", { name: en.common.bookLesson })).toHaveAttribute(
      "href",
      "/book",
    );
  });
});
