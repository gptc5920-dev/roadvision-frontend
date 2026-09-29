import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/api";

export function useApi(
  path,
  { enabled = true, interval = 0, pollWhen = () => true } = {},
) {
  const [state, setState] = useState({
    data: null,
    loading: enabled,
    error: "",
  });
  const mounted = useRef(true);
  const dataRef = useRef(null);
  const pollWhenRef = useRef(pollWhen);
  pollWhenRef.current = pollWhen;
  const requestRef = useRef(null);
  const sequenceRef = useRef(0);
  const load = useCallback(async () => {
    if (!enabled || !path) return null;
    if (
      requestRef.current?.path === path &&
      !requestRef.current.controller.signal.aborted
    ) {
      return requestRef.current.promise;
    }
    if (requestRef.current) requestRef.current.controller.abort();
    setState((current) => ({
      ...current,
      loading: current.data === null,
      error: "",
    }));
    const controller = new AbortController();
    const sequence = ++sequenceRef.current;
    const promise = (async () => {
      try {
        const data = await apiFetch(path, { signal: controller.signal });
        if (mounted.current && sequence === sequenceRef.current) {
          dataRef.current = data;
          setState({ data, loading: false, error: "" });
        }
        return data;
      } catch (error) {
        if (error.name === "AbortError") return null;
        if (mounted.current && sequence === sequenceRef.current)
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message,
          }));
        return null;
      } finally {
        if (requestRef.current?.sequence === sequence) {
          requestRef.current = null;
        }
      }
    })();
    requestRef.current = { path, controller, sequence, promise };
    return promise;
  }, [enabled, path]);
  useEffect(() => {
    mounted.current = true;
    load();
    const timer =
      interval && enabled
        ? window.setInterval(() => {
            if (!document.hidden && pollWhenRef.current(dataRef.current))
              load();
          }, interval)
        : null;
    return () => {
      mounted.current = false;
      if (requestRef.current?.path === path)
        requestRef.current.controller.abort();
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, interval, load, path]);
  return { ...state, reload: load };
}

export function useAction(reload) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fields, setFields] = useState({});
  const inFlight = useRef(false);
  const run = useCallback(
    async (action) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setPending(true);
      setNotice(null);
      setFields({});
      try {
        const result = await action();
        if (result?.messages?.length)
          setNotice({
            level: result.messages.some((item) => item.level === "warning")
              ? "warning"
              : result.messages[0].level,
            text: result.messages.map((item) => item.text).join(" "),
          });
        if (reload) await reload();
        return result;
      } catch (error) {
        setNotice({ level: "error", text: error.message });
        setFields(error.payload?.fields || {});
        return null;
      } finally {
        setPending(false);
        inFlight.current = false;
      }
    },
    [reload],
  );
  return { pending, notice, fields, setNotice, run };
}
