// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { IdleLogoutGuard } from "@/components/idle-logout-guard";

/*
  Signing out after inactivity is the one feature that must not depend on a
  server being reachable.

  It called `signOut()`, which is a round-trip, and did nothing else. A laptop
  closed at a desk and opened somewhere with no wifi yet ran the timer, fired
  the request, watched it fail — and left the screen exactly as it was, with
  the previous person's data on it. The protection has to be local first and
  tell the server second.
*/

const { statusMock, signOutMock } = vi.hoisted(() => ({
  statusMock: vi.fn(() => "authenticated"),
  signOutMock: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signOut: signOutMock }));
vi.mock("@/hooks/use-verified-session", () => ({
  useVerifiedSession: () => ({ data: null, status: statusMock() }),
}));

const IDLE_MS = 12 * 60 * 60_000;

function renderGuard() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <IdleLogoutGuard />
    </NextIntlClientProvider>,
  );
}

const lockScreen = () => screen.queryByRole("alertdialog");

describe("IdleLogoutGuard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    statusMock.mockReturnValue("authenticated");
    signOutMock.mockReset();
    signOutMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("stays out of the way while someone is using the page", () => {
    renderGuard();

    act(() => {
      vi.advanceTimersByTime(IDLE_MS - 1000);
    });

    expect(lockScreen()).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  test("covers the page the moment the timer fires", () => {
    renderGuard();

    act(() => {
      vi.advanceTimersByTime(IDLE_MS);
    });

    expect(lockScreen()).toBeInTheDocument();
  });

  test("covers it even when the sign-out request fails", () => {
    // The whole point: no wifi is not a reason to keep showing the data.
    signOutMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderGuard();

    act(() => {
      vi.advanceTimersByTime(IDLE_MS);
    });

    expect(lockScreen()).toBeInTheDocument();
  });

  test("still asks the server to end the session", () => {
    renderGuard();

    act(() => {
      vi.advanceTimersByTime(IDLE_MS);
    });

    expect(signOutMock).toHaveBeenCalled();
  });

  test("tries again when the network comes back", () => {
    signOutMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderGuard();
    act(() => {
      vi.advanceTimersByTime(IDLE_MS);
    });
    expect(signOutMock).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(signOutMock).toHaveBeenCalledTimes(2);
  });

  test("activity before the deadline puts the timer back", () => {
    renderGuard();

    act(() => {
      vi.advanceTimersByTime(IDLE_MS - 1000);
      window.dispatchEvent(new Event("keydown"));
      vi.advanceTimersByTime(2000);
    });

    expect(lockScreen()).toBeNull();
  });

  test("actually hides what is behind it", () => {
    // An overlay with no background covers nothing. `bg-canvas` is not a real
    // utility here — there is no `--color-canvas` token — so the class would
    // have compiled to nothing at all and the data would have stayed visible
    // under a transparent sheet.
    renderGuard();
    act(() => {
      vi.advanceTimersByTime(IDLE_MS);
    });

    const overlay = lockScreen()!;
    expect(overlay.className).toMatch(/bg-(surface|\[var\(--app-canvas\)\])/);
    expect(overlay.className).toContain("fixed inset-0");
  });

  test("signing in again reloads the page rather than routing to it", () => {
    // A client-side navigation would leave the React tree that holds the data
    // alive behind the new page.
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { assign, href: "http://localhost/" },
      writable: true,
    });
    renderGuard();
    act(() => {
      vi.advanceTimersByTime(IDLE_MS);
    });

    screen.getByRole("button", { name: en.auth.idleLockAction }).click();

    expect(assign).toHaveBeenCalledWith("/auth/signin");
  });

  test("does nothing at all for a signed-out visitor", () => {
    statusMock.mockReturnValue("unauthenticated");
    renderGuard();

    act(() => {
      vi.advanceTimersByTime(IDLE_MS * 2);
    });

    expect(lockScreen()).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
