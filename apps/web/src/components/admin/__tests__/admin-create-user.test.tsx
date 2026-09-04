// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { AdminCreateUser } from "@/components/admin/admin-create-user";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

/*
  Teaching here is by invitation, and until now that meant waiting for the
  person to sign up as a student so an admin could change the column
  afterwards — they saw a student dashboard first, and somebody had to remember
  to go back. This creates the account with the role already on it.
*/

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdminCreateUser />
    </NextIntlClientProvider>,
  );
}

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: en.admin.createUser.open }));

describe("AdminCreateUser", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 201 })));
    // jsdom does not implement showModal, and it has to actually set `open` or
    // the dialog's contents stay out of the accessibility tree.
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  test("creates a teacher from an email address", async () => {
    renderForm();
    open();
    fireEvent.change(screen.getByLabelText(en.admin.createUser.email), {
      target: { value: "mika@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: en.admin.createUser.submit }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } })
      .mock.calls[0];
    expect(url).toBe("/api/admin/users");
    expect(JSON.parse(String(init.body))).toMatchObject({
      email: "mika@example.com",
      role: "TEACHER",
    });
  });

  test("defaults to teacher, which is the reason this exists", () => {
    renderForm();
    open();

    expect(screen.getByLabelText(en.admin.createUser.role)).toHaveValue("TEACHER");
  });

  test("offers no way to mint an administrator", () => {
    // The endpoint refuses it; the form should not suggest it either.
    renderForm();
    open();

    const roles = Array.from(
      screen.getByLabelText(en.admin.createUser.role).querySelectorAll("option"),
    ).map((o) => o.getAttribute("value"));
    expect(roles).not.toContain("SUPER_ADMIN");
  });

  test("says what went wrong rather than failing silently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "A user with that email already exists" }), {
          status: 409,
        }),
      ),
    );
    renderForm();
    open();
    fireEvent.change(screen.getByLabelText(en.admin.createUser.email), {
      target: { value: "taken@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: en.admin.createUser.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/);
  });
});
