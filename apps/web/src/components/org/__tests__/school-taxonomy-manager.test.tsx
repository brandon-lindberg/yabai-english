// @vitest-environment jsdom

import {
  describe,
  expect,
  test,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { SchoolTaxonomyManager } from "../school-taxonomy-manager";

const orgId = "org-1";
const schoolId = "school-1";

const initialLevels = {
  classLevels: [
    {
      id: "lvl-1",
      code: "year-7",
      label: "Year 7",
      labelJa: null,
      labelEn: "Year 7",
      sortOrder: 0,
      active: true,
    },
  ],
};
const initialTypes = {
  classTypes: [
    {
      id: "type-1",
      code: "conv",
      label: "Conversation",
      labelJa: null,
      labelEn: "Conversation",
      sortOrder: 0,
      active: true,
    },
  ],
};

function setupFetchMock() {
  const fetchSpy = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = typeof url === "string" ? url : url.toString();
    const method = init?.method ?? "GET";
    if (u.endsWith("/class-levels") && method === "GET") {
      return new Response(JSON.stringify(initialLevels), { status: 200 });
    }
    if (u.endsWith("/class-types") && method === "GET") {
      return new Response(JSON.stringify(initialTypes), { status: 200 });
    }
    if (u.endsWith("/class-levels") && method === "POST") {
      const body = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          classLevel: {
            id: "lvl-2",
            ...body,
            labelJa: body.labelJa ?? null,
            labelEn: body.labelEn ?? null,
            sortOrder: body.sortOrder ?? 0,
            active: true,
          },
        }),
        { status: 201 },
      );
    }
    if (u.includes("/class-levels/") && method === "DELETE") {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

function renderManager() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SchoolTaxonomyManager orgId={orgId} schoolId={schoolId} />
    </NextIntlClientProvider>,
  );
}

describe("SchoolTaxonomyManager", () => {
  let fetchSpy: ReturnType<typeof setupFetchMock>;

  beforeEach(() => {
    fetchSpy = setupFetchMock();
  });
  afterEach(() => vi.unstubAllGlobals());

  test("fetches and renders existing class levels and types", async () => {
    renderManager();
    await waitFor(() => {
      expect(screen.getByText("Year 7")).toBeInTheDocument();
      expect(screen.getByText("Conversation")).toBeInTheDocument();
    });
  });

  test("creates a new class level via POST", async () => {
    renderManager();
    await waitFor(() => screen.getByText("Year 7"));

    fireEvent.click(
      screen.getByRole("button", {
        name: en.org.school.taxonomyPage.addLevel,
      }),
    );

    const codeInputs = screen.getAllByLabelText(
      en.org.school.taxonomyPage.code,
    );
    fireEvent.change(codeInputs[0], { target: { value: "year-8" } });
    const labelInputs = screen.getAllByLabelText(
      en.org.school.taxonomyPage.label,
    );
    fireEvent.change(labelInputs[0], { target: { value: "Year 8" } });

    const saveButtons = screen.getAllByRole("button", {
      name: en.org.school.taxonomyPage.save,
    });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      const post = fetchSpy.mock.calls.find(
        (c) =>
          (c[1] as RequestInit | undefined)?.method === "POST" &&
          String(c[0]).endsWith("/class-levels"),
      );
      expect(post).toBeTruthy();
      const body = JSON.parse((post![1] as RequestInit).body as string);
      expect(body.code).toBe("year-8");
      expect(body.label).toBe("Year 8");
    });
  });

  test("removes a class level via DELETE", async () => {
    renderManager();
    await waitFor(() => screen.getByText("Year 7"));

    const removeButtons = screen.getAllByRole("button", {
      name: en.org.school.taxonomyPage.remove,
    });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      const del = fetchSpy.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === "DELETE",
      );
      expect(del).toBeTruthy();
      expect(String(del![0])).toContain("/class-levels/lvl-1");
    });
  });
});
