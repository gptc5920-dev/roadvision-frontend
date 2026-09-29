// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Modal } from "./Modal";
import { MaskEditor } from "./MaskEditor";
import { useAction } from "../../hooks/useApi";
import { ApiError } from "../../services/api";

afterEach(cleanup);

describe("modal form validation", () => {
  it("keeps server errors in the dialog, focuses the invalid input, and restores focus on close", async () => {
    const user = userEvent.setup();
    function Form() {
      const [open, setOpen] = useState(false);
      const action = useAction();
      return (
        <>
          <button onClick={() => setOpen(true)}>Register</button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Camera"
            notice={action.notice}
            fields={action.fields}
            pending={action.pending}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                action.run(() =>
                  Promise.reject(
                    new ApiError("Correct the highlighted fields.", 400, {
                      fields: { device_id: ["Already registered."] },
                    }),
                  ),
                );
              }}
            >
              <label>
                Device ID
                <input name="device_id" />
              </label>
              <button>Save</button>
            </form>
          </Modal>
        </>
      );
    }
    render(<Form />);
    await user.click(screen.getByText("Register"));
    await user.click(screen.getByText("Save"));
    const dialog = screen.getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert").textContent).toContain(
        "Already registered.",
      ),
    );
    expect(
      screen.getByLabelText("Device ID").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Device ID"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByText("Register")),
    );
  });

  it("traps keyboard focus and prevents dismissal while saving", async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(
      <Modal open title="Saving" onClose={close} pending>
        <input aria-label="First" />
        <button>Last</button>
      </Modal>,
    );
    screen.getByText("Last").focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("First"));
    await user.keyboard("{Escape}");
    expect(close).not.toHaveBeenCalled();
  });

  it("ignores repeated submissions while the first request is pending", async () => {
    const submit = vi.fn(() => new Promise(() => {}));
    function Submitter() {
      const action = useAction();
      return (
        <button
          onClick={() => {
            action.run(submit);
            action.run(submit);
          }}
        >
          Submit
        </button>
      );
    }
    render(<Submitter />);
    await userEvent.click(screen.getByText("Submit"));
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe("mask editing", () => {
  const first = [
    [0.1, 0.1],
    [0.2, 0.1],
    [0.2, 0.2],
  ];
  const second = [
    [0.5, 0.5],
    [0.6, 0.5],
    [0.6, 0.6],
  ];
  const image = {
    url: "/image.png",
    filename: "road",
    annotations: [{ points: first }, { points: second }],
  };
  it("loads and saves all existing instances without dropping the second pothole", async () => {
    const save = vi.fn();
    render(<MaskEditor image={image} onSave={save} />);
    await userEvent.click(screen.getByText("Save all masks"));
    expect(save).toHaveBeenCalledWith([first, second]);
  });
  it("rejects unfinished instances, then allows removing just that instance", async () => {
    const save = vi.fn();
    render(<MaskEditor image={image} onSave={save} />);
    await userEvent.click(screen.getByText("Add pothole"));
    await userEvent.click(screen.getByText("Save all masks"));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("three points");
    await userEvent.click(screen.getByText("Remove mask"));
    await userEvent.click(screen.getByText("Save all masks"));
    expect(save).toHaveBeenCalledWith([first, second]);
  });
});
