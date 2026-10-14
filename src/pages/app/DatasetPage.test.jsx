// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DatasetPage } from "./DatasetPage";

const mocks = vi.hoisted(() => ({ data: null, submit: vi.fn() }));
vi.mock("../../hooks/useApi", () => ({
  useApi: () => ({
    data: mocks.data,
    loading: false,
    error: "",
    reload: vi.fn(),
  }),
  useAction: () => ({
    run: (action) => action(),
    pending: false,
    notice: null,
    setNotice: vi.fn(),
  }),
}));
vi.mock("../../services/api", () => ({
  endpoints: { dataset: "/api/dataset/" },
  submitAction: mocks.submit,
}));
afterEach(cleanup);
beforeEach(() => {
  mocks.submit.mockReset().mockResolvedValue({ messages: [] });
  mocks.data = {
    images: [],
    sessions: [],
    readiness: { ready: true, errors: [] },
  };
});
function view(tab) {
  render(
    <MemoryRouter initialEntries={[`/app/dataset?tab=${tab}`]}>
      <DatasetPage />
    </MemoryRouter>,
  );
}
describe("training workflow", () => {
  it("takes a successfully queued session to history", async () => {
    view("training");
    await userEvent.click(
      screen.getByRole("button", { name: "Queue training session" }),
    );
    expect(mocks.submit).toHaveBeenCalledOnce();
    expect(mocks.submit.mock.calls[0][1].get("action")).toBe("start_training");
    expect(
      await screen.findByRole("heading", { name: "Training history" }),
    ).toBeTruthy();
  });
  it("explains why training is blocked", () => {
    mocks.data.readiness = {
      ready: false,
      errors: ["test requires 10 approved images; found 0"],
    };
    view("training");
    expect(
      screen.getByText("test requires 10 approved images; found 0"),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Queue training session" }).disabled,
    ).toBe(true);
  });
  it("requeues a failed session using its identifier", async () => {
    mocks.data.sessions = [
      {
        id: 7,
        model: "yolo11n-seg",
        status: "failed",
        active: false,
        error: "Weights unavailable",
        precision: null,
        recall: null,
        map50: null,
      },
    ];
    view("history");
    await userEvent.click(
      screen.getByRole("button", { name: "Retry training" }),
    );
    const body = mocks.submit.mock.calls[0][1];
    expect(body.get("action")).toBe("retry_training");
    expect(body.get("session_id")).toBe("7");
  });
});
