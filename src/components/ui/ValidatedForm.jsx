import { useEffect, useId, useRef, useState } from "react";

export function ValidatedForm({
  fields = {},
  validate,
  onSubmit,
  children,
  ...props
}) {
  const form = useRef(null);
  const summary = useRef(null);
  const id = useId();
  const [clientFields, setClientFields] = useState({});
  const errors = Object.keys(clientFields).length ? clientFields : fields;
  useEffect(() => {
    const inputs = Array.from(form.current.querySelectorAll("[name]"));
    const saved = inputs.map((input) => ({
      input,
      invalid: input.getAttribute("aria-invalid"),
      description: input.getAttribute("aria-describedby"),
    }));
    inputs
      .filter((input) => errors[input.name])
      .forEach((input) => {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute(
          "aria-describedby",
          [input.getAttribute("aria-describedby"), `${id}-${input.name}`]
            .filter(Boolean)
            .join(" "),
        );
      });
    const first = inputs.find(
      (input) =>
        errors[input.name] && input.type !== "hidden" && !input.disabled,
    );
    if (Object.keys(errors).length) (first || summary.current)?.focus();
    return () =>
      saved.forEach(({ input, invalid, description }) => {
        if (invalid === null) input.removeAttribute("aria-invalid");
        else input.setAttribute("aria-invalid", invalid);
        if (description === null) input.removeAttribute("aria-describedby");
        else input.setAttribute("aria-describedby", description);
      });
  }, [errors, id]);
  return (
    <form
      {...props}
      ref={form}
      onChange={() => {
        if (Object.keys(clientFields).length) setClientFields({});
      }}
      onSubmit={(event) => {
        const issues = validate?.(new FormData(event.currentTarget)) || {};
        if (Object.keys(issues).length) {
          event.preventDefault();
          setClientFields(issues);
          return;
        }
        return onSubmit(event);
      }}
    >
      {Object.keys(errors).length > 0 && (
        <ul className="field-errors" role="alert" ref={summary} tabIndex={-1}>
          {Object.entries(errors).map(([name, messages]) => (
            <li key={name} id={`${id}-${name}`}>
              <strong>
                {name === "__all__" ? "Form" : name.replaceAll("_", " ")}:{" "}
              </strong>
              {Array.isArray(messages) ? messages.join(" ") : String(messages)}
            </li>
          ))}
        </ul>
      )}
      {children}
    </form>
  );
}

export function PresetNumber({ name, options, defaultValue, ...props }) {
  const values = options.map((value) => String(value));
  const [choice, setChoice] = useState(
    values.includes(String(defaultValue)) ? String(defaultValue) : "custom",
  );
  return (
    <>
      <select
        disabled={props.disabled}
        name={choice === "custom" ? undefined : name}
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
        <option value="custom">Custom value…</option>
      </select>
      {choice === "custom" && (
        <input
          type="number"
          name={name}
          defaultValue={defaultValue}
          required
          aria-label={`Custom ${name.replaceAll("_", " ")}`}
          {...props}
        />
      )}
    </>
  );
}
