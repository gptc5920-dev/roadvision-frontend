// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useAction, useApi } from "../../hooks/useApi";
import { submitAction } from "../../services/api";
import { AnalyzerPage } from "./AnalyzerPage";

vi.mock("../../hooks/useApi", () => ({
  useApi: vi.fn(),
  useAction: vi.fn(),
}));
vi.mock("../../services/api", async (importOriginal) => ({
  ...(await importOriginal()),
  submitAction: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAction.mockReturnValue({
    run: vi.fn((callback) => callback()),
    pending: false,
    notice: null,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function CurrentSearch() {
  return <output data-testid="current-search">{useLocation().search}</output>;
}

function renderQueue() {
  const analyses = [
    { id: 1, name: "Selected survey", status: "complete" },
    { id: 2, name: "Other survey", status: "queued" },
    { id: 3, name: "Live survey", status: "running" },
  ];
  const reload = vi.fn();
  useApi.mockReturnValue({
    loading: false,
    reload,
    data: {
      configuration: { ready: true, confidenceThreshold: 30 },
      analyses,
      selected: {
        ...analyses[0],
        processingFps: 10,
        realtimeFactor: 1,
        uniquePotholes: 0,
        totalDetections: 0,
        media: {},
        tracks: [],
      },
    },
  });
  render(
    <MemoryRouter initialEntries={["/app/analyzer?analysis=1"]}>
      <AnalyzerPage />
      <CurrentSearch />
    </MemoryRouter>,
  );
  return { reload };
}

describe("analysis queue removal", () => {
  it("confirms and removes the clicked run without changing another selection", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    submitAction.mockResolvedValue({ ok: true });
    const { reload } = renderQueue();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Other survey" }),
    );
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(confirm.mock.calls[0][0]).toContain("Other survey");
    const [domain, body] = submitAction.mock.calls[0];
    expect(domain).toBe("analyzer");
    expect(body.get("action")).toBe("remove_analysis");
    expect(body.get("analysis_id")).toBe("2");
    expect(screen.getByTestId("current-search").textContent).toBe(
      "?analysis=1",
    );
  });

  it("clears the deleted selection and reloads the queue", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    submitAction.mockResolvedValue({ ok: true });
    const { reload } = renderQueue();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Selected survey" }),
    );
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(screen.getByTestId("current-search").textContent).toBe("");
    expect(submitAction.mock.calls[0][1].get("analysis_id")).toBe("1");
  });

  it("keeps the run when confirmation is declined", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { reload } = renderQueue();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Other survey" }),
    );
    expect(submitAction).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("keeps the current selection when removal fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    submitAction.mockResolvedValue({ ok: false });
    const { reload } = renderQueue();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Selected survey" }),
    );
    await waitFor(() => expect(submitAction).toHaveBeenCalledOnce());
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("current-search").textContent).toBe(
      "?analysis=1",
    );
  });

  it("disables removal for running analyses and during a pending action", () => {
    renderQueue();
    expect(
      screen.getByRole("button", { name: "Remove Live survey" }).disabled,
    ).toBe(true);
    cleanup();
    useAction.mockReturnValue({ run: vi.fn(), pending: true, notice: null });
    renderQueue();
    for (const button of screen.getAllByRole("button", { name: /^Remove / }))
      expect(button.disabled).toBe(true);
  });
});

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
