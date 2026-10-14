// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DetectionsPage } from "./DetectionsPage";
vi.mock("../../hooks/useApi", () => ({
  useApi: () => ({
    loading: false,
    data: {
      counts: { total: 1, unresolved: 1, confirmed: 0, critical: 0 },
      tracks: [
        {
          id: 3,
          code: "A12-P3",
          label: "pothole",
          severity: "low",
          reviewStatus: "unresolved",
          averageConfidence: 80,
          estimatedAreaSqm: null,
        },
      ],
    },
  }),
  useAction: () => ({ pending: false, run: vi.fn(), notice: null, fields: {} }),
}));
afterEach(cleanup);
describe("defect detail links", () => {
  it("opens the selected defect review from the map and keeps the dialog closed after dismissal", async () => {
    render(
      <MemoryRouter initialEntries={["/app/detections?analysis=12&track=3"]}>
        <DetectionsPage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("dialog", { name: "Review A12-P3" }),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
