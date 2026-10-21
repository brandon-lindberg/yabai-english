// @vitest-environment jsdom

import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { SignInForm } from "../sign-in-form";

const signIn = vi.fn();
const { prepareMock } = vi.hoisted(() => ({ prepareMock: vi.fn(async ({ callbackUrl }: { callbackUrl: string }) => callbackUrl) }));
vi.mock("@/lib/learning-journey-actions", () => ({ prepareLearningSignIn: prepareMock }));
vi.mock("next-auth/react", () => ({ signIn: (...args: unknown[]) => signIn(...args) }));

/*
  An expired PKCE cookie is recoverable without the user doing anything: they
  are already authenticated with Google, so restarting the flow lands them
  straight through. The risk is the opposite failure — a browser that can never
  hold the cookie would bounce forever — so the one-attempt guard is the part
  these tests exist to hold down.
*/
function renderForm(authError: "retry" | "denied" | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SignInForm
        hasGoogleOAuth
        devEmailSignIn={false}
        safePostLoginPath="/dashboard"
        authError={authError}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  signIn.mockReset();
  prepareMock.mockClear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("SignInForm expired sign-in recovery", () => {
  test("a failed OAuth return retries this tab's subject instead of another tab's visitor cookie", async () => {
    sessionStorage.setItem("learning-signin-choice", JSON.stringify({ learningLanguage: "JAPANESE", callbackUrl: "/en/book" }));
    renderForm("retry");
    await waitFor(() => expect(prepareMock).toHaveBeenCalledWith({ learningLanguage: "JAPANESE", locale: "en", callbackUrl: "/en/book" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Japanese");
  });
  test("Japanese signup is explicit and prepares its intent before starting OAuth", async () => {
    render(<NextIntlClientProvider locale="en" messages={en}><SignInForm hasGoogleOAuth devEmailSignIn={false} safePostLoginPath="/en/book" learningLanguage="JAPANESE" /></NextIntlClientProvider>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Japanese");
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    await waitFor(() => expect(prepareMock).toHaveBeenCalledWith({ learningLanguage: "JAPANESE", locale: "en", callbackUrl: "/en/book" }));
  });
  test("restarts the flow once so an expired cookie costs no second login", async () => {
    renderForm("retry");

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/dashboard" });
    expect(screen.getByText(en.auth.signInRetrying)).toBeInTheDocument();
  });

  test("does not retry a second time, so an unsettable cookie cannot loop", async () => {
    const first = renderForm("retry");
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    first.unmount();

    renderForm("retry");

    await waitFor(() => expect(screen.getByText(en.auth.signInRetry)).toBeInTheDocument());
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  test("a clean visit clears the guard, so the next expiry gets its own retry", async () => {
    const first = renderForm("retry");
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    first.unmount();

    renderForm(null).unmount();
    renderForm("retry");

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));
  });

  test("never retries a rejected account", async () => {
    renderForm("denied");

    await waitFor(() => expect(screen.getByText(en.auth.signInDenied)).toBeInTheDocument());
    expect(signIn).not.toHaveBeenCalled();
  });

  test("shows nothing and does not retry on a normal visit", async () => {
    renderForm(null);

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(signIn).not.toHaveBeenCalled();
  });
});
