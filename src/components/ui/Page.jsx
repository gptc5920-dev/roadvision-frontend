import { Icon } from "../icons/Icon";
import { titleCase } from "../../utils/format";

export function PageHeader({ eyebrow, title, copy, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && (
          <span className="eyebrow">
            <i />
            {eyebrow}
          </span>
        )}
        <h1>{title}</h1>
        {copy && <p>{copy}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
export function Panel({ title, copy, actions, className = "", children }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel__header">
          <div>
            {title && <h2>{title}</h2>}
            {copy && <p>{copy}</p>}
          </div>
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}
export function MetricCard({ label, value, detail, tone = "green", icon }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      {icon && (
        <span className="metric-card__icon">
          <Icon name={icon} />
        </span>
      )}
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
export function StatusBadge({ value, label }) {
  const normalized = String(value || "unknown").toLowerCase();
  return (
    <span className={`status status--${normalized}`}>
      {label || titleCase(normalized)}
    </span>
  );
}
export function ProgressBar({ value, label }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="progress">
      <div className="progress__copy">
        <span>{label || "Progress"}</span>
        <strong>{safe}%</strong>
      </div>
      <div className="progress__track">
        <i style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
