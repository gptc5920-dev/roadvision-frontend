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
import { ApiError, submitAction } from "../../services/api";
import { ReportsPage } from "./ReportsPage";

vi.mock("../../hooks/useApi", async (original) => ({
  ...(await original()),
  useApi: vi.fn(),
}));
vi.mock("../../services/api", async (original) => ({
  ...(await original()),
  submitAction: vi.fn(),
}));

const report = {
  id: 7,
  city: "Manila",
  deviceId: "CAM-01",
  lat: 14.6,
  lng: 121,
  severity: "high",
  status: "open",
  notes: "Initial survey",
  imageUrl: "https://example.com/evidence.jpg",
  detectedAt: "2026-11-17T04:34:56Z",
};
let reload;
beforeEach(() => {
  vi.clearAllMocks();
  reload = vi.fn();
  useApi.mockReturnValue({
    loading: false,
    reload,
    data: {
      reports: [report],
      query: "",
      pagination: { limit: 50, offset: 0, total: 1 },
    },
  });
});
afterEach(cleanup);
function openPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>,
  );
}

describe("report editing", () => {
  it("opens existing details, saves the same report, and refreshes its list", async () => {
    submitAction.mockResolvedValue({
      ok: true,
      messages: [{ level: "success", text: "Report #7 saved." }],
    });
    openPage();
    expect(
      screen.getByRole("link", { name: "Video analysis" }).getAttribute("href"),
    ).toBe("/app/analyzer?report=7");
    fireEvent.click(screen.getByRole("button", { name: "Edit report #7" }));
    expect(screen.getByLabelText("City").value).toBe("Manila");
    expect(screen.getByLabelText("Source device ID").value).toBe("CAM-01");
    expect(screen.getByLabelText("Evidence image URL").value).toBe(
      report.imageUrl,
    );
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Laguna" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "resolved" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const [domain, body] = submitAction.mock.calls[0];
    expect(domain).toBe("reports");
    expect(body.get("action")).toBe("update_report");
    expect(body.get("report_id")).toBe("7");
    expect(body.get("city")).toBe("Laguna");
    expect(body.get("status")).toBe("resolved");
    expect(body.get("detected_at")).toBe("2026-11-17T04:34:56.000Z");
    expect(reload).toHaveBeenCalledOnce();
    expect(screen.getByText("Report #7 saved.").closest(".toast")).toBeTruthy();
  });

  it("preserves edits and displays backend field errors without closing the dialog", async () => {
    submitAction.mockRejectedValue(
      new ApiError("Correct the report details.", 400, {
        fields: { city: ["Enter a valid city."] },
      }),
    );
    openPage();
    fireEvent.click(screen.getByRole("button", { name: "Edit report #7" }));
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Changed city" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));
    expect(
      await screen.findByText("Enter a valid city.", { exact: false }),
    ).toBeTruthy();
    expect(screen.getByLabelText("City").value).toBe("Changed city");
    expect(screen.getByLabelText("City").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit report #7" }));
    expect(
      screen.queryByText("Enter a valid city.", { exact: false }),
    ).toBeNull();
    expect(screen.getByLabelText("City").value).toBe("Manila");
  });

  it("cancels without writing changes", () => {
    openPage();
    fireEvent.click(screen.getByRole("button", { name: "Edit report #7" }));
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Unsaved" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(submitAction).not.toHaveBeenCalled();
  });

  it("blocks duplicate saves while the backend is working", async () => {
    let finish;
    submitAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    openPage();
    fireEvent.click(screen.getByRole("button", { name: "Edit report #7" }));
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));
    expect(screen.getByRole("button", { name: "Saving…" }).disabled).toBe(true);
    fireEvent.submit(
      screen.getByRole("button", { name: "Saving…" }).closest("form"),
    );
    expect(submitAction).toHaveBeenCalledOnce();
    finish({ ok: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("report browsing", () => {
  it("searches through the backend and hides stale rows", () => {
    openPage();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search reports" }),
      {
        target: { value: "Cavite" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(useApi.mock.calls.at(-1)[0]).toBe(
      "/api/reports/records/?limit=50&offset=0&q=Cavite",
    );
    expect(screen.queryByRole("button", { name: "Edit report #7" })).toBeNull();
  });

  it("pages through all reports without editing a row from the previous page", () => {
    useApi.mockReturnValue({
      loading: false,
      reload,
      data: {
        reports: [report],
        query: "",
        pagination: { limit: 50, offset: 0, total: 80 },
      },
    });
    openPage();
    expect(screen.getByRole("button", { name: "Previous" }).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(useApi.mock.calls.at(-1)[0]).toBe(
      "/api/reports/records/?limit=50&offset=50",
    );
    expect(screen.queryByRole("button", { name: "Edit report #7" })).toBeNull();
  });
});
