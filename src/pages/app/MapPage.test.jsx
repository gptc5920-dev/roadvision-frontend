// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MapPage } from "./MapPage";
vi.mock("../../components/ui/GeographicMap", () => ({
  GeographicMap: ({ points, onSelect }) => (
    <div>
      {points.map((point) => (
        <button key={point.key} onClick={() => onSelect(point.key)}>
          Marker {point.code}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("../../hooks/useApi", () => ({
  useApi: () => ({
    loading: false,
    data: {
      reports: [
        {
          id: 7,
          lat: 14.6,
          lng: 121,
          city: "Manila",
          severity: "high",
          status: "open",
        },
        { id: 8, lat: null, lng: null },
      ],
      detections: [
        {
          id: 3,
          code: "A12-P3",
          analysisId: 12,
          lat: 14.7,
          lng: 121.1,
          city: "Route 17",
          severity: "critical",
          status: "unresolved",
        },
      ],
    },
  }),
}));
afterEach(cleanup);
describe("map navigation", () => {
  it("maps located incidents and opens the report and directions", async () => {
    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Marker #7" }),
    );
    expect(screen.queryByRole("button", { name: "Marker #8" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Open details" }).getAttribute("href"),
    ).toBe("/app/dispatch?report=7");
    expect(
      screen.getByRole("link", { name: "Get directions" }).getAttribute("href"),
    ).toContain("destination=14.6%2C121");
    await userEvent.click(
      screen.getByRole("button", { name: "Marker A12-P3" }),
    );
    expect(
      screen.getByRole("link", { name: "Open details" }).getAttribute("href"),
    ).toBe("/app/detections?analysis=12&track=3");
  });
});
