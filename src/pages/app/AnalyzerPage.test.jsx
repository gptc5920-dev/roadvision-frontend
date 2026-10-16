// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { AnalyzerPage } from "./AnalyzerPage";

vi.mock("../../hooks/useApi", () => ({
  useApi: vi.fn(),
  useAction: () => ({ run: vi.fn(), pending: false, notice: null }),
}));
afterEach(cleanup);

function renderTrack(source, polygon, overrides = {}) {
  useApi.mockReturnValue({
    loading: false,
    reload: vi.fn(),
    data: {
      configuration: { ready: true, confidenceThreshold: 30 },
      analyses: [],
      selected: {
        status: "complete",
        name: "Road survey",
        processingFps: 10,
        realtimeFactor: 1,
        uniquePotholes: 1,
        totalDetections: 2,
        averageConfidence: 90,
        media: { processed: "/processed.mp4" },
        tracks: [
          {
            id: 1,
            code: "A1-P1",
            severity: "low",
            averageConfidence: 90,
            firstTimestamp: 1,
            snapshotFrameUrl: "/frame.jpg",
            snapshotCropUrl: "/crop.jpg",
            segmentationPoints: polygon,
            maskSource: source,
            ...overrides,
          },
        ],
      },
    },
  });
  return render(
    <MemoryRouter>
      <AnalyzerPage />
    </MemoryRouter>,
  );
}

describe("analyzer mask previews", () => {
  const polygon = [
    [0.2, 0.3],
    [0.6, 0.3],
    [0.4, 0.7],
  ];
  it.each(["model", "estimated"])(
    "renders %s polygons over the matching full-frame snapshot",
    (source) => {
      renderTrack(source, polygon);
      const preview = screen.getByAltText("Road defect with mask overlay");
      expect(preview.getAttribute("src")).toBe("/frame.jpg");
      const overlay = preview.parentElement.querySelector("svg");
      expect(overlay.classList.contains(`mask-overlay--${source}`)).toBe(true);
      expect(overlay.querySelector("polygon").getAttribute("points")).toBe(
        "0.2,0.3 0.6,0.3 0.4,0.7",
      );
      expect(screen.queryByText(/Estimated mask/)).toBe(
        source === "estimated" ? screen.getByText(/Estimated mask/) : null,
      );
    },
  );
  it("keeps a crop preview when no polygon was saved", () => {
    renderTrack("none", []);
    expect(
      screen.getByAltText("Pothole detection crop").getAttribute("src"),
    ).toBe("/crop.jpg");
    expect(screen.queryByAltText("Road defect with mask overlay")).toBeNull();
  });

  it("falls back to the crop without applying full-frame mask coordinates", () => {
    renderTrack("estimated", polygon);
    fireEvent.error(screen.getByAltText("Road defect with mask overlay"));
    expect(
      screen.getByAltText("Pothole detection crop").getAttribute("src"),
    ).toBe("/crop.jpg");
    expect(document.querySelector(".mask-overlay")).toBeNull();
    fireEvent.error(screen.getByAltText("Pothole detection crop"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Snapshot unavailable")).toBeTruthy();
  });

  it("falls back to the full frame if the crop cannot load", () => {
    renderTrack("none", []);
    fireEvent.error(screen.getByAltText("Pothole detection crop"));
    expect(
      screen.getByAltText("Road defect snapshot").getAttribute("src"),
    ).toBe("/frame.jpg");
    expect(document.querySelector(".mask-overlay")).toBeNull();
  });

  it("shows legacy full-frame snapshots without a crop or polygon", () => {
    renderTrack("none", [], { snapshotCropUrl: "" });
    expect(
      screen.getByAltText("Road defect snapshot").getAttribute("src"),
    ).toBe("/frame.jpg");
  });

  it("shows a consistent empty state when no snapshot was saved", () => {
    renderTrack("none", [], { snapshotCropUrl: "", snapshotFrameUrl: "" });
    expect(screen.getByText("Snapshot unavailable")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
