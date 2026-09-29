import { useState } from "react";

export function MaskOverlay({ masks }) {
  return (
    <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      {masks.map((points, index) => (
        <polygon
          key={index}
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        />
      ))}
    </svg>
  );
}

export function MaskEditor({ image, onSave, pending }) {
  const [masks, setMasks] = useState(() =>
    image.annotations.map((item) => item.points || []),
  );
  const [active, setActive] = useState(image.annotations.length ? 0 : -1);
  const [error, setError] = useState("");
  const points = masks[active] || [];
  function update(points) {
    setError("");
    if (active < 0) {
      setMasks([points]);
      setActive(0);
    } else
      setMasks((current) =>
        current.map((mask, index) => (index === active ? points : mask)),
      );
  }
  function addPoint(event) {
    if (pending) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (value) => Math.max(0, Math.min(1, Number(value.toFixed(6))));
    update([
      ...points,
      [
        clamp((event.clientX - rect.left) / rect.width),
        clamp((event.clientY - rect.top) / rect.height),
      ],
    ]);
  }
  async function save() {
    if (masks.some((mask) => mask.length < 3)) {
      setError(
        "Each pothole needs at least three points. Complete or remove unfinished masks.",
      );
      return;
    }
    await onSave(masks);
  }
  return (
    <>
      <div className="mask-editor" onClick={addPoint}>
        <img src={image.url} alt={image.filename} draggable="false" />
        <MaskOverlay masks={masks} />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {points.map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r=".008" />
          ))}
        </svg>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="annotation-toolbar">
        <label>
          Selected pothole{" "}
          <select
            aria-label="Selected pothole"
            value={active}
            disabled={pending || !masks.length}
            onChange={(event) => setActive(Number(event.target.value))}
          >
            {!masks.length && <option value={-1}>No masks</option>}
            {masks.map((mask, index) => (
              <option key={index} value={index}>
                Pothole {index + 1} ({mask.length} points)
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button button--secondary"
          disabled={pending}
          onClick={() => {
            setMasks([...masks, []]);
            setActive(masks.length);
          }}
        >
          Add pothole
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={pending || !points.length}
          onClick={() => update(points.slice(0, -1))}
        >
          Undo point
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={pending || active < 0}
          onClick={() => {
            setMasks(masks.filter((_, index) => index !== active));
            setActive(masks.length > 1 ? 0 : -1);
          }}
        >
          Remove mask
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={pending}
          onClick={save}
        >
          {masks.length ? "Save all masks" : "Save as no potholes"}
        </button>
      </div>
      <p>
        Save every visible pothole before approving. An image with no masks is a
        negative training example.
      </p>
    </>
  );
}
