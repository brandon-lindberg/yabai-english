// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { PlacementQuiz } from "../placement-quiz";

const push = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push }),
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & React.HTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, update: vi.fn() }),
}));

describe("PlacementQuiz skeleton loading", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders skeleton placeholder while loading the first question", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PlacementQuiz />
      </NextIntlClientProvider>,
    );

    const loading = await screen.findByTestId("placement-quiz-loading");
    expect(loading).toBeInTheDocument();
    const skeletons = loading.querySelectorAll("[data-testid='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(skeletons[0].className).toContain("app-skeleton");

    resolveFetch?.({
      ok: true,
      json: async () => ({
        question: {
          id: "q1",
          instructionEn: "Pick one",
          instructionJa: "選ぶ",
          questionEn: "The best answer is?",
          optionsEn: ["A", "B", "C", "D"],
        },
        attemptToken: "token",
        progress: { current: 1, total: 24 },
      }),
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTestId("placement-quiz-loading"),
    );
  });
});
