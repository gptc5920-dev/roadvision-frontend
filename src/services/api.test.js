import { afterEach, describe, expect, it, vi } from "vitest";
import {
  actionEndpoint,
  apiFetch,
  ApiError,
  csrfToken,
  setCsrfToken,
} from "./api";

afterEach(() => {
  setCsrfToken("");
  vi.unstubAllGlobals();
});

describe("API client", () => {
  it("keeps the server-provided CSRF token in memory", () => {
    setCsrfToken("rotated-token");

    expect(csrfToken()).toBe("rotated-token");
  });

  it("maps action domains to their Django endpoints", () => {
    expect(actionEndpoint("analyzer")).toBe("/api/actions/analyzer/");
    expect(actionEndpoint("dataset")).toBe("/api/actions/dataset/");
    expect(actionEndpoint("dispatch")).toBe("/api/actions/modules/dispatch/");
  });

  it("serializes object bodies and sends the rotated CSRF token", async () => {
    setCsrfToken("rotated-token");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/example/", {
      method: "POST",
      body: { value: 42 },
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.body).toBe('{"value":42}');
    expect(options.headers.get("Content-Type")).toBe("application/json");
    expect(options.headers.get("X-CSRFToken")).toBe("rotated-token");
  });

  it("turns malformed JSON responses into a stable API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("{", {
            status: 502,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    await expect(apiFetch("/api/example/")).rejects.toEqual(
      expect.objectContaining({
        name: ApiError.name,
        message: "The server returned invalid JSON.",
        status: 502,
      }),
    );
  });
});
