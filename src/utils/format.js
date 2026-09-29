export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "—";
  return new Intl.NumberFormat("en-PH", options).format(Number(value));
}
export function formatPercent(value, digits = 0) {
  return value === null || value === undefined
    ? "—"
    : `${formatNumber(value, { maximumFractionDigits: digits })}%`;
}
export function formatDate(value, includeTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}
export function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}
export function titleCase(value = "") {
  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
