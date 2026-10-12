// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./AppLayout";

vi.mock("../app/SessionContext", () => ({
  useSession: () => ({
    user: { name: "Road engineer", initials: "RE", role: "engineer" },
    refresh: vi.fn(),
  }),
}));

let query;
beforeEach(() => {
  localStorage.clear();
  query = new EventTarget();
  query.matches = true;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => query),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

function consoleView() {
  return render(
    <MemoryRouter initialEntries={["/app/map"]}>
      <Routes>
        <Route path="/app" element={<AppLayout />}>
          <Route path="map" element={<h1>Map view</h1>} />
          <Route path="dashboard" element={<h1>Dashboard view</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("responsive navigation", () => {
  it("closes the mobile drawer after logo navigation and restores scrolling and focus", async () => {
    const user = userEvent.setup();
    consoleView();
    const menu = screen.getByRole("button", { name: "Toggle navigation" });
    const nav = screen.getByRole("complementary", {
      name: "Primary navigation",
    });
    expect(nav.hasAttribute("inert")).toBe(true);
    await user.click(menu);
    expect(document.body.style.overflow).toBe("hidden");
    expect(nav.hasAttribute("inert")).toBe(false);
    await user.click(
      within(nav).getByRole("link", { name: "RoadVision home" }),
    );
    expect(
      screen.getByRole("heading", { name: "Dashboard view" }),
    ).toBeTruthy();
    expect(nav.hasAttribute("inert")).toBe(true);
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(menu);
  });

  it("keeps keyboard focus inside the open drawer and closes it with Escape", async () => {
    const user = userEvent.setup();
    consoleView();
    const menu = screen.getByRole("button", { name: "Toggle navigation" });
    await user.click(menu);
    const nav = screen.getByRole("complementary", {
      name: "Primary navigation",
    });
    const first = within(nav).getByRole("link", { name: "RoadVision home" });
    const last = within(nav).getByRole("button", { name: "Sign out" });
    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    await user.keyboard("{Escape}");
    expect(nav.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(menu);
    expect(document.body.style.overflow).toBe("");
  });

  it("clears the mobile drawer on desktop resize and restores it after returning to mobile", async () => {
    const user = userEvent.setup();
    consoleView();
    const menu = screen.getByRole("button", { name: "Toggle navigation" });
    const nav = screen.getByRole("complementary", {
      name: "Primary navigation",
    });
    await user.click(menu);
    act(() => {
      query.matches = false;
      query.dispatchEvent(new Event("change"));
    });
    expect(document.body.style.overflow).toBe("");
    expect(nav.hasAttribute("inert")).toBe(false);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    await user.click(menu);
    expect(localStorage.getItem("rv-nav-collapsed")).toBe("true");
    act(() => {
      query.matches = true;
      query.dispatchEvent(new Event("change"));
    });
    expect(nav.hasAttribute("inert")).toBe(true);
    await user.click(menu);
    expect(nav.hasAttribute("inert")).toBe(false);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("page search", () => {
  it("filters pages, supports keyboard selection and clears the query after navigation", async () => {
    const user = userEvent.setup();
    consoleView();
    const input = screen.getByRole("searchbox", { name: "Search pages" });
    await user.type(input, "  DASH  ");
    const results = screen.getByRole("navigation", {
      name: "Page search results",
    });
    expect(within(results).getAllByRole("link")).toHaveLength(1);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(
      within(results).getByRole("link", { name: "Dashboard" }),
    );
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "Dashboard view" }),
    ).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search pages" }).value).toBe(
      "",
    );
    expect(
      screen.queryByRole("navigation", { name: "Page search results" }),
    ).toBeNull();
  });

  it("shows no matches without navigating and dismisses results with Escape", async () => {
    const user = userEvent.setup();
    consoleView();
    const input = screen.getByRole("searchbox", { name: "Search pages" });
    await user.type(input, "not-a-page{Enter}");
    expect(screen.getByRole("status").textContent).toContain(
      "No matching pages",
    );
    expect(screen.getByRole("heading", { name: "Map view" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("navigation", { name: "Page search results" }),
    ).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it("opens the first matching page on submit and dismisses results when focus leaves", async () => {
    const user = userEvent.setup();
    consoleView();
    const input = screen.getByRole("searchbox", { name: "Search pages" });
    await user.type(input, "dashboard");
    await user.click(screen.getByRole("heading", { name: "Map view" }));
    expect(
      screen.queryByRole("navigation", { name: "Page search results" }),
    ).toBeNull();
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "Dashboard view" }),
    ).toBeTruthy();
  });
});
