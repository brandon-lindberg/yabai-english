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
    {
      id: "lvl-2",
      code: "year-8",
      label: "Year 8",
      labelJa: null,
      labelEn: "Year 8",
      sortOrder: 1,
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
            id: "lvl-new",
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
    if (u.includes("/class-levels/") && method === "PATCH") {
      return new Response(JSON.stringify({ classLevel: {} }), { status: 200 });
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
      const yearSevenCells = screen.getAllByText("Year 7");
      expect(yearSevenCells.length).toBeGreaterThan(0);
      const convCells = screen.getAllByText("Conversation");
      expect(convCells.length).toBeGreaterThan(0);
    });
  });

  test("renders preview of level×type combinations", async () => {
    renderManager();
    await waitFor(() => {
      expect(
        screen.getByTestId("taxonomy-combo-lvl-1-type-1"),
      ).toHaveTextContent(/Year 7.*Conversation/);
      expect(
        screen.getByTestId("taxonomy-combo-lvl-2-type-1"),
      ).toHaveTextContent(/Year 8.*Conversation/);
    });
  });

  test("does NOT render the in-card duplicate description", async () => {
    renderManager();
    await waitFor(() => screen.getAllByText("Year 7"));
    expect(
      screen.queryByText(en.org.school.taxonomyPage.description),
    ).not.toBeInTheDocument();
  });

  test("creates a new class level via POST", async () => {
    renderManager();
    await waitFor(() => screen.getByText("Year 7"));

    fireEvent.click(
      screen.getByRole("button", {
        name: en.org.school.taxonomyPage.addLevel,
      }),
    );

    const nameInputs = screen.getAllByLabelText(
      en.org.school.taxonomyPage.name,
    );
    fireEvent.change(nameInputs[0], { target: { value: "Year 8" } });

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
      expect(body.labelEn).toBe("Year 8");
      expect(body.code).toBeUndefined();
    });
  });

  test("add form does not include a Sort order input", async () => {
    renderManager();
    await waitFor(() => screen.getByText("Year 7"));

    fireEvent.click(
      screen.getByRole("button", {
        name: en.org.school.taxonomyPage.addLevel,
      }),
    );

    expect(
      screen.queryByLabelText(en.org.school.taxonomyPage.sortOrder),
    ).not.toBeInTheDocument();
  });

  test("clicking move-down on first row swaps sortOrder via two PATCH calls", async () => {
    renderManager();
    await waitFor(() => screen.getByText("Year 7"));

    const downButtons = screen.getAllByRole("button", {
      name: en.org.school.taxonomyPage.moveDown,
    });
    fireEvent.click(downButtons[0]);

    await waitFor(() => {
      const patches = fetchSpy.mock.calls.filter(
        (c) =>
          (c[1] as RequestInit | undefined)?.method === "PATCH" &&
          String(c[0]).includes("/class-levels/"),
      );
      expect(patches).toHaveLength(2);
      const targets = patches.map((c) => String(c[0]));
      expect(targets).toContain(
        `/api/org/${orgId}/schools/${schoolId}/class-levels/lvl-1`,
      );
      expect(targets).toContain(
        `/api/org/${orgId}/schools/${schoolId}/class-levels/lvl-2`,
      );
      const bodies = patches.map((c) =>
        JSON.parse((c[1] as RequestInit).body as string),
      );
      const sorts = bodies.map((b) => b.sortOrder).sort();
      expect(sorts).toEqual([0, 1]);
    });
  });

  test("clicking the Name column header toggles sort direction", async () => {
    renderManager();
    await waitFor(() => screen.getByText("Year 7"));

    const headers = screen.getAllByRole("button", {
      name: new RegExp(`^${en.org.school.taxonomyPage.nameColumn}`),
    });
    const levelsHeader = headers[0];

    const before = screen.getAllByTestId("taxonomy-row-label-lvl");
    expect(before.map((n) => n.textContent)).toEqual(["Year 7", "Year 8"]);

    fireEvent.click(levelsHeader);
    const afterAsc = screen.getAllByTestId("taxonomy-row-label-lvl");
    expect(afterAsc.map((n) => n.textContent)).toEqual(["Year 7", "Year 8"]);

    fireEvent.click(levelsHeader);
    const afterDesc = screen.getAllByTestId("taxonomy-row-label-lvl");
    expect(afterDesc.map((n) => n.textContent)).toEqual(["Year 8", "Year 7"]);
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
