// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import L from "leaflet";
import { GeographicMap } from "./GeographicMap";

let svg;
let width;
let height;
beforeEach(() => {
  svg = L.Browser.svg;
  L.Browser.svg = true;
  width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  height = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientHeight",
  );
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 900,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 610,
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  L.Browser.svg = svg;
  if (width) Object.defineProperty(HTMLElement.prototype, "clientWidth", width);
  else delete HTMLElement.prototype.clientWidth;
  if (height)
    Object.defineProperty(HTMLElement.prototype, "clientHeight", height);
  else delete HTMLElement.prototype.clientHeight;
  vi.unstubAllGlobals();
});
describe("interactive geographic map", () => {
  it("renders real Leaflet markers and supports keyboard selection and cleanup", () => {
    const select = vi.fn();
    const props = {
      points: [
        {
          key: "report-7",
          code: "#7",
          lat: 14.6,
          lng: 121,
          city: "Manila",
          severity: "high",
        },
      ],
      selectedKey: null,
      onSelect: select,
    };
    const view = render(<GeographicMap {...props} />);
    const marker = screen.getByRole("button", { name: "high #7 in Manila" });
    fireEvent.keyDown(marker, { key: "Enter" });
    expect(select).toHaveBeenCalledWith("report-7");
    view.rerender(<GeographicMap {...props} selectedKey="report-7" />);
    expect(
      screen
        .getByLabelText("Road incident map")
        .classList.contains("leaflet-container"),
    ).toBe(true);
    view.unmount();
    // A fresh mount after cleanup must not fail with "Map container is already initialized".
    render(<GeographicMap {...props} />);
    expect(
      screen.getByRole("button", { name: "high #7 in Manila" }),
    ).toBeTruthy();
  });
});
