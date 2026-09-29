import { Link } from "react-router-dom";

export function Brand({ compact = false, to = "/", inverse = false }) {
  return (
    <Link
      className={`brand${compact ? " brand--compact" : ""}${inverse ? " brand--inverse" : ""}`}
      to={to}
      aria-label="RoadVision home"
    >
      <span className="brand__symbol" aria-hidden="true">
        <svg viewBox="0 0 38 38">
          <path d="M19 3 34 10v9c0 8.5-5.2 13.9-15 16C9.2 32.9 4 27.5 4 19v-9L19 3Z" />
          <path d="m15.5 11.5 2.2 5.2-3 10.2M22.5 11.5l-2.2 5.2 3 10.2" />
          <path d="M19 9v4m0 7v4" />
        </svg>
      </span>
      <span className="brand__copy">
        <strong>RoadVision</strong>
        <small>Road intelligence</small>
      </span>
    </Link>
  );
}
