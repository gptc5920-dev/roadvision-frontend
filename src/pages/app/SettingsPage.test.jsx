// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";
import { ApiError } from "../../services/api";

const mocks = vi.hoisted(() => ({
  admin: true,
  submit: vi.fn(),
  refresh: vi.fn(),
  reload: vi.fn(),
}));
vi.mock("../../services/api", async (original) => ({
  ...(await original()),
  submitAction: mocks.submit,
}));
vi.mock("../../app/SessionContext", () => ({
  useSession: () => ({
    user: { isAdmin: mocks.admin },
    refresh: mocks.refresh,
  }),
}));
vi.mock("../../hooks/useApi", async (original) => ({
  ...(await original()),
  useApi: () => ({
    loading: false,
    reload: mocks.reload,
    data: {
      configuration: {
        modelSession: 1,
        trainingModel: "yolo11s-seg",
        mode: "accurate",
        confidenceThreshold: 30,
        iouThreshold: 45,
        inputResolution: 512,
        frameSkip: 1,
        device: "cpu",
        tracker: "iou",
        maxDetections: 100,
        maxAttempts: 3,
        minTrackAppearances: 2,
        dedupIouThreshold: 0.35,
        dedupMaxGapFrames: 90,
      },
      models: [{ id: 1, name: "Pothole model", map50: 0.6 }],
      modelReadiness: { ready: true, errors: [] },
      datasetReadiness: { ready: false, errors: [] },
      profile: { name: "Road engineer", email: "engineer@example.com" },
    },
  }),
}));
beforeEach(() => {
  mocks.admin = true;
  mocks.submit.mockReset().mockResolvedValue({ ok: true });
  mocks.refresh.mockReset();
  mocks.reload.mockReset().mockResolvedValue({});
});
afterEach(cleanup);
describe("settings forms", () => {
  it("keeps analyzer presets disabled for non-admins while allowing profile edits", async () => {
    mocks.admin = false;
    render(<SettingsPage />);
    expect(
      screen.getByRole("combobox", { name: "Confidence threshold" }).disabled,
    ).toBe(true);
    expect(screen.getByLabelText("Full name").disabled).toBe(false);
    expect(
      screen.queryByRole("button", { name: "Save analyzer settings" }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Update profile" }),
    );
    expect(mocks.submit.mock.calls[0][1].get("action")).toBe("update_profile");
  });
  it("shows analyzer validation errors without marking the profile form invalid", async () => {
    mocks.submit.mockRejectedValue(
      new ApiError("Correct the fields.", 400, {
        fields: { confidence_threshold: ["Choose a valid threshold."] },
      }),
    );
    render(<SettingsPage />);
    await userEvent.click(
      screen.getByRole("button", { name: "Save analyzer settings" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Choose a valid threshold.",
    );
    const confidence = screen.getByRole("combobox", {
      name: "Confidence threshold",
    });
    expect(document.activeElement).toBe(confidence);
    expect(confidence.value).toBe("30");
    expect(confidence.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.getByLabelText("Full name").hasAttribute("aria-invalid"),
    ).toBe(false);
    expect(screen.getByLabelText("Full name").value).toBe("Road engineer");
  });
});
