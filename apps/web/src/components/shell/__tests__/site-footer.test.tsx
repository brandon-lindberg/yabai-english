// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { SiteFooter } from "@/components/shell/site-footer";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const messages = (namespace === "legal"
      ? en.legal
      : namespace === "becomeTeacher"
        ? en.becomeTeacher
        : en.common) as Record<string, string>;
    return (key: string, values?: Record<string, string | number>) =>
      (messages[key] ?? key).replace(/\{(\w+)\}/g, (_m, name: string) =>
        String(values?.[name] ?? ""),
      );
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
  The teaching page belongs in the header for signed-out visitors, not in the
  footer. The footer is on every page, so it put an invitation-only teaching
  page in front of the students and teachers it has nothing to say to.
*/

describe("SiteFooter", () => {
  test("does not carry the teaching page", async () => {
    render(await SiteFooter());

    expect(screen.queryByRole("link", { name: en.becomeTeacher.title })).toBeNull();
  });

  test("keeps the links that were already there", async () => {
    render(await SiteFooter());

    expect(screen.getByRole("link", { name: en.common.footerContact })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getByRole("link", { name: en.legal.footerTermsLink })).toBeInTheDocument();
  });
});
