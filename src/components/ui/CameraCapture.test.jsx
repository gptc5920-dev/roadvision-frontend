// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CameraCapture } from "./CameraCapture";

let track, camera, getUserMedia, instances;
const originalMediaDevices = Object.getOwnPropertyDescriptor(
  navigator,
  "mediaDevices",
);

class FakeRecorder {
  static isTypeSupported(type) {
    return type === "video/webm;codecs=vp8";
  }
  constructor(stream, options) {
    this.stream = stream;
    this.mimeType = options.mimeType || "video/mp4";
    this.state = "inactive";
    instances.push(this);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["recorded-video"], { type: this.mimeType }),
    });
    this.onstop?.();
  }
}

beforeEach(() => {
  instances = [];
  track = { stop: vi.fn(), getSettings: () => ({ deviceId: "camera-1" }) };
  camera = { getTracks: () => [track], getVideoTracks: () => [track] };
  getUserMedia = vi.fn().mockResolvedValue(camera);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices: vi.fn().mockResolvedValue([
        { kind: "videoinput", deviceId: "camera-1", label: "Front camera" },
        { kind: "videoinput", deviceId: "camera-2", label: "USB dashcam" },
      ]),
    },
  });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn(() => "blob:recorded-clip");
      static revokeObjectURL = vi.fn();
    },
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalMediaDevices)
    Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  else delete navigator.mediaDevices;
});

async function enable() {
  fireEvent.click(screen.getByRole("button", { name: "Enable camera" }));
  await screen.findByRole("button", { name: "Start recording" });
}

describe("camera capture", () => {
  it("asks for the mobile rear camera without audio and records a usable clip", async () => {
    const change = vi.fn();
    render(<CameraCapture kind="mobile" onChange={change} />);
    expect(getUserMedia).not.toHaveBeenCalled();
    await enable();
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    expect(screen.getByLabelText("Live camera preview").srcObject).toBe(camera);
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    fireEvent.click(screen.getByRole("button", { name: /Stop recording/ }));
    const file = change.mock.calls[0][0];
    expect(file).toBeInstanceOf(File);
    expect(file.name).toMatch(/^mobile-capture-.*\.webm$/);
    expect(file.size).toBeGreaterThan(0);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(
      (await screen.findByLabelText("Recorded camera clip")).getAttribute(
        "src",
      ),
    ).toBe("blob:recorded-clip");
    fireEvent.click(
      screen.getByRole("button", { name: "Record another clip" }),
    );
    expect(change).toHaveBeenLastCalledWith(null);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:recorded-clip");
  });

  it("lets the user switch to a connected dashcam and releases the previous camera", async () => {
    const view = render(<CameraCapture kind="dashcam" onChange={vi.fn()} />);
    await enable();
    const selector = await screen.findByLabelText("Camera device");
    fireEvent.change(selector, { target: { value: "camera-2" } });
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(getUserMedia.mock.calls[1][0].video.deviceId).toEqual({
      exact: "camera-2",
    });
    expect(track.stop).toHaveBeenCalledOnce();
    await screen.findByRole("button", { name: "Start recording" });
    view.unmount();
    expect(track.stop).toHaveBeenCalledTimes(2);
  });

  it("stops recording automatically after 45 seconds", async () => {
    const change = vi.fn();
    render(<CameraCapture onChange={change} />);
    await enable();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    act(() => vi.advanceTimersByTime(45_000));
    expect(instances[0].state).toBe("inactive");
    expect(change).toHaveBeenCalledOnce();
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("stops an active recorder and its camera when the dialog closes", async () => {
    const change = vi.fn();
    const view = render(<CameraCapture onChange={change} />);
    await enable();
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    view.unmount();
    expect(instances[0].state).toBe("inactive");
    expect(track.stop).toHaveBeenCalledOnce();
    expect(change).not.toHaveBeenCalled();
  });

  it("releases a camera whose permission request resolves after closing", async () => {
    let resolve;
    getUserMedia.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<CameraCapture onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Enable camera" }));
    view.unmount();
    await act(async () => resolve(camera));
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("shows a permission error and allows a retry", async () => {
    getUserMedia.mockRejectedValueOnce({ name: "NotAllowedError" });
    render(<CameraCapture onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Enable camera" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "permission was denied",
    );
    await enable();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("offers an upload fallback when recording is unsupported", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    render(<CameraCapture onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Enable camera" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "Upload a video or use a Stream URL",
    );
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("uses an MP4 file when the browser records MP4", async () => {
    vi.stubGlobal(
      "MediaRecorder",
      class extends FakeRecorder {
        static isTypeSupported(type) {
          return type === "video/mp4";
        }
      },
    );
    const change = vi.fn();
    render(<CameraCapture onChange={change} />);
    await enable();
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    fireEvent.click(screen.getByRole("button", { name: /Stop recording/ }));
    expect(change.mock.calls[0][0].name).toMatch(/\.mp4$/);
  });
});
