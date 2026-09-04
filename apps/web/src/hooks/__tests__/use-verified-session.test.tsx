// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useVerifiedSession } from "@/hooks/use-verified-session";

/*
  next-auth's client cannot tell "you are signed out" from "I could not ask".

  `fetchData` catches every fetch error and returns null; `status` is then
  derived as `session ? "authenticated" : "unauthenticated"`. So one failed
  request to /api/auth/session — a laptop opened before the wifi is up, a
  coffee-shop captive portal, a dropped connection — reports the user as
  signed out while their cookie is perfectly valid.

  It is also sticky: `_getSession` bails out early whenever `_session === null`
  ("if the client doesn't have a session we don't need to ask the server"), so
  neither the focus refetch nor the poll ever corrects it. Only a full reload
  does — which is exactly what a puzzled user eventually does.
*/

const { sessionMock, updateMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(() => ({ data: null as unknown, status: "authenticated" })),
  updateMock: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ ...sessionMock(), update: updateMock }),
}));

const signedIn = { user: { name: "Kana" } };

function Probe() {
  const { status } = useVerifiedSession();
  return <span data-testid="status">{status}</span>;
}

function status() {
  return screen.getByTestId("status").textContent;
}

describe("useVerifiedSession", () => {
  beforeEach(() => {
    sessionMock.mockReturnValue({ data: signedIn, status: "authenticated" });
    updateMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("passes a real session straight through", () => {
    render(<Probe />);

    expect(status()).toBe("authenticated");
  });

  test("keeps you signed in when the session check could not be made", async () => {
    // The whole point. A request that never reached the server says nothing
    // about whether the user is signed in, so nothing about them changes.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const view = render(<Probe />);

    sessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
    await act(async () => {
      view.rerender(<Probe />);
    });

    expect(status()).toBe("authenticated");
  });

  test("signs you out when the server actually says you are signed out", async () => {
    // A reachable server returning an empty session is real evidence, and has
    // to be honoured — otherwise signing out in another tab leaves this one
    // showing a signed-in header forever.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => null }),
    );
    const view = render(<Probe />);

    sessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
    await act(async () => {
      view.rerender(<Probe />);
    });

    await waitFor(() => expect(status()).toBe("unauthenticated"));
  });

  test("recovers once the network is back, without a reload", async () => {
    // next-auth will not retry on its own — `_session === null` short-circuits
    // every later refetch — so the recovery has to come from here.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const view = render(<Probe />);
    sessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
    await act(async () => {
      view.rerender(<Probe />);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => signedIn }),
    );
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
  });

  test("stays quiet while the session is merely loading", () => {
    sessionMock.mockReturnValue({ data: null, status: "loading" });
    render(<Probe />);

    expect(status()).toBe("loading");
  });
});
