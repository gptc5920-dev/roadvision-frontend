export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

let currentCsrfToken = "";

export function setCsrfToken(value) {
  currentCsrfToken = value || "";
}

export function csrfToken() {
  if (currentCsrfToken) return currentCsrfToken;
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const method = (options.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method))
    headers.set("X-CSRFToken", csrfToken());
  let body = options.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const isUrlEncoded =
    typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  if (
    body &&
    !isFormData &&
    !isUrlEncoded &&
    !isBlob &&
    typeof body !== "string"
  ) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    body,
    method,
    headers,
  });
  const type = response.headers.get("content-type") || "";
  const rawPayload = await response.text();
  let payload = rawPayload;
  if (type.includes("application/json") && rawPayload) {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      throw new ApiError("The server returned invalid JSON.", response.status);
    }
  }
  if (payload?.csrfToken) setCsrfToken(payload.csrfToken);
  if (!response.ok) {
    throw new ApiError(
      payload?.error ||
        payload?.detail ||
        payload?.messages
          ?.filter((item) => item.level?.includes("error"))
          .map((item) => item.text)
          .join(" ") ||
        `Request failed (${response.status}).`,
      response.status,
      payload,
    );
  }
  return payload;
}

export const endpoints = {
  session: "/api/session/",
  login: "/api/auth/login/",
  logout: "/api/auth/logout/",
  overview: "/api/overview/",
  reports: "/api/reports/",
  fleet: "/api/fleet/",
  detections: "/api/detections/",
  analyzer: "/api/analyzer/",
  dataset: "/api/dataset/",
  sources: "/api/sources/",
  personnel: "/api/personnel/",
  settings: "/api/settings/",
};

export function actionEndpoint(domain) {
  return domain === "analyzer" || domain === "dataset"
    ? `/api/actions/${domain}/`
    : `/api/actions/modules/${domain}/`;
}

export function submitAction(domain, body) {
  return apiFetch(actionEndpoint(domain), { method: "POST", body });
}
