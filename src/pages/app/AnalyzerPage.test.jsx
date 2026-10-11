// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { AnalyzerPage } from "./AnalyzerPage";

vi.mock("../../hooks/useApi", () => ({
  useApi: vi.fn(),
  useAction: () => ({ run: vi.fn(), pending: false, notice: null }),
}));
afterEach(cleanup);

function renderTrack(source, polygon) {
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
});
