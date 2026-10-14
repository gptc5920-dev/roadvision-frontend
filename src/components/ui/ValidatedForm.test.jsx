// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ValidatedForm, PresetNumber } from "./ValidatedForm";
import { useAction } from "../../hooks/useApi";
import { ApiError } from "../../services/api";

afterEach(cleanup);
describe("page form feedback", () => {
  it("shows server errors, focuses the invalid field, and preserves help text after correction", async () => {
    const user = userEvent.setup();
    const save = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError("Invalid device", 400, {
          fields: { device: ["Use a supported device."] },
        }),
      )
      .mockResolvedValue({ ok: true });
    function Page() {
      const action = useAction();
      return (
        <ValidatedForm
          fields={action.fields}
          onSubmit={(event) => {
            event.preventDefault();
            return action.run(save);
          }}
        >
          <label>
            Device
            <input name="device" aria-describedby="device-help" />
          </label>
          <small id="device-help">Choose an available device.</small>
          <button>Save</button>
        </ValidatedForm>
      );
    }
    render(<Page />);
    await user.click(screen.getByText("Save"));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Use a supported device.",
    );
    const field = screen.getByLabelText("Device");
    expect(document.activeElement).toBe(field);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")).toContain("device-help");
    await user.type(field, "cpu");
    await user.click(screen.getByText("Save"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field.getAttribute("aria-describedby")).toBe("device-help");
  });
  it("submits a preset or a custom value with exactly one field name", async () => {
    const user = userEvent.setup();
    const submitted = [];
    render(
      <ValidatedForm
        onSubmit={(event) => {
          event.preventDefault();
          submitted.push(new FormData(event.currentTarget).getAll("epochs"));
        }}
      >
        <label>
          Epochs
          <PresetNumber
            name="epochs"
            options={[10, 50, 100]}
            defaultValue={100}
            min={1}
            max={1000}
          />
        </label>
        <button>Queue</button>
      </ValidatedForm>,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Epochs" }),
      "50",
    );
    await user.click(screen.getByText("Queue"));
    expect(submitted[0]).toEqual(["50"]);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Epochs" }),
      "custom",
    );
    const custom = screen.getByRole("spinbutton", { name: "Custom epochs" });
    await user.clear(custom);
    await user.type(custom, "75");
    await user.click(screen.getByText("Queue"));
    expect(submitted[1]).toEqual(["75"]);
  });
  it("blocks invalid split totals before submitting", async () => {
    const save = vi.fn();
    render(
      <ValidatedForm
        validate={() => ({ __all__: ["Splits must total 100%."] })}
        onSubmit={save}
      >
        <button>Upload</button>
      </ValidatedForm>,
    );
    await userEvent.click(screen.getByText("Upload"));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Splits must total 100%.",
    );
    expect(document.activeElement).toBe(screen.getByRole("alert"));
  });
});
