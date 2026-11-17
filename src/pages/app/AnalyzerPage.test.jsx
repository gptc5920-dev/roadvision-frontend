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
vi.mock("../../components/ui/CameraCapture", () => ({
  CameraCapture: ({ kind, onChange }) => (
    <button
      type="button"
      onClick={() =>
        onChange(new File(["clip"], `${kind}.webm`, { type: "video/webm" }))
      }
    >
      Record test clip
    </button>
  ),
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
      report: { id: 7, city: "Manila", deviceId: "CAM-01" },
      reports: [
        { id: 7, city: "Manila", deviceId: "CAM-01" },
        { id: 8, city: "Cavite", deviceId: "CAM-02" },
      ],
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

describe("analysis notifications", () => {
  it("floats queued messages outside the page and supports dismissal", () => {
    const setNotice = vi.fn();
    useAction.mockReturnValue({
      pending: false,
      notice: {
        level: "success",
        text: "Video analysis queued for Pothole testing.mp4.",
      },
      setNotice,
    });
    renderQueue();

    const notification = screen
      .getByText("Video analysis queued for Pothole testing.mp4.")
      .closest('[role="status"]');
    expect(notification.closest(".toast").parentElement).toBe(document.body);
    expect(notification.closest(".page")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(setNotice).toHaveBeenCalledWith(null);
  });

  it("keeps feedback inside the open upload dialog without a duplicate toast", () => {
    useAction.mockReturnValue({
      pending: false,
      notice: { level: "error", text: "Please choose a video file." },
    });
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "Upload and analyze" }));

    expect(screen.getAllByText("Please choose a video file.")).toHaveLength(1);
    expect(screen.getByRole("status").closest('[role="dialog"]')).toBeTruthy();
    expect(document.querySelector(".toast")).toBeNull();
  });
});

describe("report-specific analysis", () => {
  it("keeps another report's stale results hidden while switching reports", () => {
    renderQueue();
    fireEvent.change(screen.getByLabelText("Report"), {
      target: { value: "8" },
    });
    expect(screen.getByTestId("current-search").textContent).toBe("?report=8");
    expect(useApi.mock.calls.at(-1)[0]).toBe("/api/analyzer/?report=8");
    expect(
      screen.queryByRole("heading", { name: "Selected survey" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Upload and analyze" }).disabled,
    ).toBe(true);
  });

  it("keeps queue navigation within the selected report", () => {
    renderQueue();
    fireEvent.click(
      screen.getByRole("button", { name: /Other survey.*queued/i }),
    );
    expect(screen.getByTestId("current-search").textContent).toBe(
      "?report=7&analysis=2",
    );
    expect(useApi.mock.calls.at(-1)[0]).toBe(
      "/api/analyzer/?report=7&analysis=2",
    );
  });

  it("clears the report context immediately when returning to the report picker", () => {
    renderQueue();
    fireEvent.change(screen.getByLabelText("Report"), {
      target: { value: "" },
    });
    expect(screen.getByTestId("current-search").textContent).toBe("");
    expect(
      screen.queryByRole("heading", { name: "Selected survey" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Upload and analyze" }).disabled,
    ).toBe(true);
  });

  it("requires a report before allowing uploads or camera captures", () => {
    useApi.mockReturnValue({
      loading: false,
      data: {
        report: null,
        reports: [],
        analyses: [],
        unassignedAnalyses: [],
        selected: null,
        configuration: { ready: true },
      },
    });
    render(
      <MemoryRouter>
        <AnalyzerPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: "Upload and analyze" }).disabled,
    ).toBe(true);
    expect(
      screen.getByText("Create a road report to start analysis."),
    ).toBeTruthy();
  });

  it("creates a report and opens its analyzer context", async () => {
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "New report" }));
    for (const [name, value] of [
      ["City", "Laguna"],
      ["Source device ID", "PHONE-01"],
      ["Latitude", "14.4"],
      ["Longitude", "121.2"],
    ])
      fireEvent.change(screen.getByLabelText(name), { target: { value } });
    submitAction.mockResolvedValue({
      ok: true,
      redirect: "/app/analyzer?report=55",
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Create report" }).closest("form"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("current-search").textContent).toBe(
        "?report=55",
      ),
    );
    const body = submitAction.mock.calls[0][1];
    expect(body.get("action")).toBe("create_report");
    expect(body.get("city")).toBe("Laguna");
    expect(body.get("device_id")).toBe("PHONE-01");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

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
    expect(screen.getByTestId("current-search").textContent).toBe("?report=7");
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

describe("analyzer camera sources", () => {
  it.each(["laptop", "mobile"])(
    "submits a recorded %s camera clip with the right source",
    async (kind) => {
      renderQueue();
      fireEvent.click(
        screen.getByRole("button", { name: "Upload and analyze" }),
      );
      fireEvent.change(screen.getByLabelText("Footage source"), {
        target: { value: kind },
      });
      expect(
        screen.getByRole("button", { name: "Start analysis" }).disabled,
      ).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Record test clip" }));
      const submit = screen.getByRole("button", { name: "Start analysis" });
      expect(submit.disabled).toBe(false);
      submitAction.mockResolvedValue({ ok: true });
      fireEvent.submit(submit.closest("form"));
      await waitFor(() => expect(submitAction).toHaveBeenCalledOnce());
      const [domain, body] = submitAction.mock.calls[0];
      expect(domain).toBe("analyzer");
      expect(body.get("source_type")).toBe("webcam");
      expect(body.get("camera_source")).toBe(kind);
      expect(body.get("report_id")).toBe("7");
      expect(body.get("video").name).toBe(`${kind}.webm`);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    },
  );

  it.each(["live-stream", "dashcam"])(
    "supports a Stream URL for %s",
    async (kind) => {
      renderQueue();
      fireEvent.click(
        screen.getByRole("button", { name: "Upload and analyze" }),
      );
      fireEvent.change(screen.getByLabelText("Footage source"), {
        target: { value: kind },
      });
      if (kind === "dashcam")
        fireEvent.change(screen.getByLabelText("Dashcam input"), {
          target: { value: "stream" },
        });
      fireEvent.change(screen.getByLabelText(/Stream URL/), {
        target: { value: "rtsp://camera.example.com/feed" },
      });
      submitAction.mockResolvedValue({ ok: true });
      fireEvent.submit(
        screen.getByRole("button", { name: "Start analysis" }).closest("form"),
      );
      await waitFor(() => expect(submitAction).toHaveBeenCalledOnce());
      const body = submitAction.mock.calls[0][1];
      expect(body.get("source_type")).toBe("live-stream");
      expect(body.get("stream_url")).toBe("rtsp://camera.example.com/feed");
      expect(body.has("video")).toBe(false);
    },
  );

  it("records from a USB dashcam and submits it as dashcam footage", async () => {
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "Upload and analyze" }));
    fireEvent.change(screen.getByLabelText("Footage source"), {
      target: { value: "dashcam" },
    });
    fireEvent.change(screen.getByLabelText("Dashcam input"), {
      target: { value: "camera" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record test clip" }));
    submitAction.mockResolvedValue({ ok: true });
    fireEvent.submit(
      screen.getByRole("button", { name: "Start analysis" }).closest("form"),
    );
    await waitFor(() => expect(submitAction).toHaveBeenCalledOnce());
    expect(submitAction.mock.calls[0][1].get("source_type")).toBe("dashcam");
    expect(submitAction.mock.calls[0][1].get("video").name).toBe(
      "dashcam.webm",
    );
  });

  it("discards the previous clip when the upload dialog is reopened", () => {
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "Upload and analyze" }));
    fireEvent.change(screen.getByLabelText("Footage source"), {
      target: { value: "mobile" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record test clip" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload and analyze" }));
    expect(
      screen.getByRole("button", { name: "Start analysis" }).disabled,
    ).toBe(true);
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
        id: 1,
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
    <MemoryRouter initialEntries={["/app/analyzer?analysis=1"]}>
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
