// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { UserEmailCombobox } from "../admin-org-form-fields";
import { AdminChatReports } from "../admin-chat-reports";

vi.mock("@/hooks/use-admin-collection", () => ({
  useAdminCollection: () => ({ items: [{
    id: "thread-1",
    studentReportedAt: "2026-11-05T00:00:00Z",
    teacherReportedAt: "2026-11-06T00:00:00Z",
    studentReportReason: "Student described unwanted messages.",
    teacherReportReason: "Teacher described abusive language.",
    updatedAt: "2026-11-06T00:00:00Z",
    student: { id: "student-1", name: "Hana", email: null },
    teacher: { id: "teacher-1", name: "Aki", email: null },
  }], loading: false, error: null }),
}));

function show(ui: ReactNode) {
  render(<NextIntlClientProvider locale="en" messages={en} timeZone="UTC">{ui}</NextIntlClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("a chat report shows both reports and their profile links together in a list item", () => {
  show(<AdminChatReports />);
  const thread = screen.getByRole("listitem");
  expect(within(thread).getByRole("link", { name: "Hana" })).toHaveAttribute("href", "/en/admin/users/student-1");
  expect(within(thread).getByRole("link", { name: "Aki" })).toHaveAttribute("href", "/en/admin/users/teacher-1");
  expect(within(thread).getByText("Student described unwanted messages.")).toBeVisible();
  expect(within(thread).getByText("Teacher described abusive language.")).toBeVisible();
});

test("membership email search exposes the active result and accepts it from the keyboard", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: "user", name: "Hana", email: "hana@example.com" }] }) }));
  const onChange = vi.fn();
  show(<UserEmailCombobox label="User email" value="hana" onChange={onChange} />);
  const input = screen.getByRole("combobox", { name: "User email" });
  expect(input).toHaveAttribute("aria-expanded", "false");
  fireEvent.focus(input);
  const option = await screen.findByRole("option");
  expect(input).toHaveAttribute("aria-expanded", "true");
  expect(input).toHaveAttribute("aria-activedescendant", option.id);
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onChange).toHaveBeenCalledWith("hana@example.com");
  expect(input).toHaveAttribute("aria-expanded", "false");
});
