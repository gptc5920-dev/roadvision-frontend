import { Icon } from "../icons/Icon";

export function LoadingScreen({ label = "Loading" }) {
  return (
    <main className="loading-screen">
      <span className="loading-screen__spinner" />
      <strong>{label}</strong>
    </main>
  );
}
export function LoadingBlock({ label = "Loading data" }) {
  return (
    <div className="loading-block">
      <span />
      <p>{label}</p>
    </div>
  );
}
export function ErrorBlock({ message, onRetry }) {
  return (
    <div className="error-block">
      <Icon name="alert" />
      <div>
        <strong>Unable to load this view</strong>
        <p>{message}</p>
        {onRetry && (
          <button className="button button--secondary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Notice({ notice, onClose }) {
  if (!notice) return null;
  return (
    <div className={`notice notice--${notice.level || "info"}`} role="status">
      <Icon name={notice.level === "error" ? "alert" : "check"} />
      <span>{notice.text}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss">
          <Icon name="close" size={15} />
        </button>
      )}
    </div>
  );
}
export function EmptyState({ icon = "database", title, copy, action }) {
  return (
    <div className="empty-state">
      <span>
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}
