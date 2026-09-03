// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherGroupClasses } from "../teacher-group-classes";
import {
  buildGroupClassRows,
  type GroupClassSession,
} from "@/lib/dashboard/group-classes";

/**
 * `getTranslations` needs a request context this component never gets in a
 * test, so it is served from the real message file instead — the strings under
 * assertion are the ones that ship.
 */
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async () => {
    const messages = en.dashboard.schedulePage as Record<string, string>;
    return (key: string, values?: Record<string, string | number>) => {
      const template = messages[key] ?? key;
      if (!values) return template;
      return template
        .replace(
          /\{count, plural,[^}]*=1 \{([^}]*)\}[^}]*other \{([^}]*)\}\}/,
          (_m, one: string, other: string) =>
            Number(values.count) === 1 ? one : other.replace("#", String(values.count)),
        )
        .replace(/\{(\w+)\}/g, (_m, name: string) => String(values[name] ?? ""));
    };
  },
}));

const now = new Date("2026-07-01T00:00:00.000Z");

function seat(id: string, name: string) {
  return {
    id,
    status: "CONFIRMED",
    holdExpiresAt: null,
    student: { id: `stu-${id}`, name, email: `${id}@example.com` },
  };
}

function session(overrides: Partial<GroupClassSession> = {}): GroupClassSession {
  return {
    id: "sess-1",
    startsAt: new Date("2026-07-05T01:30:00.000Z"),
    endsAt: new Date("2026-07-05T02:30:00.000Z"),
    capacity: 5,
    cancelledAt: null,
    bookings: [seat("bk-1", "Aiko"), seat("bk-2", "Ben")],
    ...overrides,
  };
}

/** Renders the server component by awaiting it, the way Next does. */
async function renderClasses(sessions: GroupClassSession[]) {
  const ui = await TeacherGroupClasses({
    classes: buildGroupClassRows(sessions, now),
    timeZone: "Asia/Tokyo",
  });
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("TeacherGroupClasses", () => {
  // The phase's whole purpose: before teaching, a teacher wants to know who is
  // coming and how much room is left.
  test("names both students and says three seats are open", async () => {
    await renderClasses([session()]);

    expect(screen.getByText(/Aiko, Ben/)).toBeInTheDocument();
    expect(screen.getByText(/2 of 5/)).toBeInTheDocument();
    expect(screen.getByText(/3 seats left/)).toBeInTheDocument();
  });

  test("says a full class is full", async () => {
    await renderClasses([session({ capacity: 2 })]);

    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(screen.queryByText(/seats left/)).not.toBeInTheDocument();
  });

  test("marks a class the teacher called off", async () => {
    await renderClasses([session({ cancelledAt: new Date("2026-07-02T00:00:00.000Z") })]);

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  test("says so when nobody has booked yet", async () => {
    await renderClasses([session({ bookings: [] })]);

    expect(screen.getByText(/No students yet/)).toBeInTheDocument();
    expect(screen.getByText(/5 seats left/)).toBeInTheDocument();
  });

  // A lapsed hold is not a student in the class, and must not be named as one.
  test("leaves out a student whose unpaid hold has lapsed", async () => {
    await renderClasses([
      session({
        bookings: [
          seat("bk-1", "Aiko"),
          {
            ...seat("bk-2", "Ben"),
            status: "PENDING_PAYMENT",
            holdExpiresAt: new Date("2026-06-30T00:00:00.000Z"),
          },
        ],
      }),
    ]);

    expect(screen.getByText(/Aiko/)).toBeInTheDocument();
    expect(screen.queryByText(/Ben/)).not.toBeInTheDocument();
    expect(screen.getByText(/1 of 5/)).toBeInTheDocument();
  });

  test("says so when there are no classes at all", async () => {
    await renderClasses([]);

    expect(screen.getByText(/No group classes coming up/)).toBeInTheDocument();
  });

  describe("calling a class off", () => {
    test("offers to cancel a class that is still on", async () => {
      await renderClasses([session()]);

      expect(screen.getByRole("button", { name: "Cancel class" })).toBeEnabled();
    });

    test("offers nothing on a class already called off", async () => {
      await renderClasses([session({ cancelledAt: new Date("2026-07-02T00:00:00.000Z") })]);

      expect(screen.queryByRole("button", { name: "Cancel class" })).not.toBeInTheDocument();
    });

    // The guard is the sentence: a teacher should see how many students they
    // are about to refund before they agree to it.
    test("says how many students will be refunded before doing it", async () => {
      const confirm = vi.fn().mockReturnValue(false);
      vi.stubGlobal("confirm", confirm);
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      await renderClasses([session()]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel class" }));

      expect(confirm).toHaveBeenCalledWith(
        expect.stringContaining("2 students will be refunded in full"),
      );
      // Declined, so nothing happened.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test("calls the class off once the teacher agrees", async () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
      vi.stubGlobal("fetch", fetchMock);

      await renderClasses([session()]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel class" }));

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/group-lesson-sessions/sess-1/cancel",
          { method: "POST" },
        ),
      );
    });

    test("shows what went wrong when the server refuses", async () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error: "This class is already cancelled." }),
        }),
      );

      await renderClasses([session()]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel class" }));

      expect(
        await screen.findByText("This class is already cancelled."),
      ).toBeInTheDocument();
    });
  });
});
