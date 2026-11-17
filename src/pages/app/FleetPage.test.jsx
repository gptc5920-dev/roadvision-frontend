// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { submitAction } from "../../services/api";
import { FleetPage } from "./FleetPage";

vi.mock("../../app/SessionContext", () => ({
  useSession: () => ({ user: { isAdmin: true } }),
}));
vi.mock("../../hooks/useApi", () => ({
  useApi: vi.fn(),
  useAction: () => ({
    pending: false,
    notice: null,
    fields: {},
    run: (callback) => callback(),
  }),
}));
vi.mock("../../services/api", async (original) => ({
  ...(await original()),
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
});
afterEach(cleanup);

function fleet(source = "mobile", overrides = {}) {
  useApi.mockReturnValue({
    loading: false,
    reload: vi.fn(),
    data: {
      devices: [
        {
          id: "survey-camera",
          name: "Survey camera",
          city: "Manila",
          fps: 30,
          status: "online",
          cameraSource: source,
          hasStream: false,
          ...overrides,
        },
      ],
    },
  });
  return render(
    <MemoryRouter>
      <FleetPage />
    </MemoryRouter>,
  );
}

describe("fleet camera sources", () => {
  it("registers laptop and mobile camera sources without a Stream URL", async () => {
    fleet();
    fireEvent.click(screen.getByRole("button", { name: "Register camera" }));
    fireEvent.change(screen.getByLabelText("Camera source"), {
      target: { value: "laptop" },
    });
    expect(screen.queryByLabelText(/Stream URL/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Camera source"), {
      target: { value: "mobile" },
    });
    fireEvent.change(screen.getByLabelText("Device ID"), {
      target: { value: "phone-01" },
    });
    fireEvent.change(screen.getByLabelText("Camera name"), {
      target: { value: "Phone survey" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Manila" },
    });
    submitAction.mockResolvedValue({ ok: true });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save camera" }).closest("form"),
    );
    await waitFor(() => expect(submitAction).toHaveBeenCalledOnce());
    const body = submitAction.mock.calls[0][1];
    expect(body.get("action")).toBe("save_fleet_device");
    expect(body.get("camera_source")).toBe("mobile");
    expect(body.has("stream_url")).toBe(false);
  });

  it.each(["laptop", "mobile", "dashcam"])(
    "submits recorded %s footage from an online camera",
    async (source) => {
      fleet(source);
      fireEvent.click(
        screen.getByRole("button", {
          name: source === "dashcam" ? "Capture dashcam clip" : "Open camera",
        }),
      );
      expect(
        screen.getByRole("button", { name: "Analyze clip" }).disabled,
      ).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Record test clip" }));
      submitAction.mockResolvedValue({
        ok: true,
        redirect: "/app/analyzer?analysis=5",
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Analyze clip" }).closest("form"),
      );
      await waitFor(() => expect(submitAction).toHaveBeenCalledOnce());
      const [domain, body] = submitAction.mock.calls[0];
      expect(domain).toBe("fleet-cams");
      expect(body.get("action")).toBe("analyze_fleet_capture");
      expect(body.get("camera_source")).toBe(source);
      expect(body.get("device_id")).toBe("survey-camera");
      expect(body.get("video").name).toBe(`${source}.webm`);
    },
  );

  it("keeps continuous stream detection available", async () => {
    fleet("stream", { hasStream: true });
    submitAction.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Start detection" }));
    await waitFor(() => expect(submitAction).toHaveBeenCalledOnce());
    expect(submitAction.mock.calls[0][1].get("action")).toBe(
      "analyze_fleet_stream",
    );
  });

  it("does not open a camera while the fleet device is offline", () => {
    fleet("mobile", { status: "offline" });
    expect(screen.getByRole("button", { name: "Open camera" }).disabled).toBe(
      true,
    );
  });
});
