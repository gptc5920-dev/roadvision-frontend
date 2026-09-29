import { useEffect, useRef, useId } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "../icons/Icon";
import { Notice } from "./Feedback";

export function Modal({
  open,
  onClose,
  title,
  copy,
  children,
  wide = false,
  pending = false,
  notice,
  fields = {},
}) {
  const content = useRef(null);
  const opener = useRef(null);
  const errorId = useId();
  useEffect(() => {
    if (!open) return;
    const inputs = Array.from(
      content.current?.querySelectorAll("[name]") || [],
    );
    inputs.forEach((input) => {
      if (fields[input.name]) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", `${errorId}-${input.name}`);
      }
    });
    inputs.find((input) => fields[input.name])?.focus();
    return () =>
      inputs.forEach((input) => {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      });
  }, [fields, open, errorId]);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal">
          <Dialog.Content
            ref={content}
            className={`modal__dialog${wide ? " modal__dialog--wide" : ""}`}
            aria-busy={pending}
            onOpenAutoFocus={() => {
              opener.current = document.activeElement;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (pending) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (pending) event.preventDefault();
            }}
          >
            <header>
              <div>
                <Dialog.Title>{title}</Dialog.Title>
                <Dialog.Description className={copy ? undefined : "sr-only"}>
                  {copy || title}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="icon-button"
                  disabled={pending}
                  aria-label="Close"
                >
                  <Icon name="close" />
                </button>
              </Dialog.Close>
            </header>
            {(notice || Object.keys(fields).length > 0) && (
              <div className="modal__feedback">
                <Notice notice={notice} />
                {Object.keys(fields).length > 0 && (
                  <ul className="field-errors" role="alert">
                    {Object.entries(fields).map(([name, errors]) => (
                      <li id={`${errorId}-${name}`} key={name}>
                        <strong>
                          {name === "__all__"
                            ? "Form"
                            : name.replaceAll("_", " ")}
                          :{" "}
                        </strong>
                        {errors.join(" ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
