import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, endpoints } from "../services/api";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState({
    loading: true,
    authenticated: false,
    user: null,
    error: "",
  });
  const refresh = useCallback(async () => {
    setSession((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await apiFetch(endpoints.session);
      setSession({
        loading: false,
        authenticated: data.authenticated,
        user: data.user || null,
        error: "",
      });
      return data;
    } catch (error) {
      setSession({
        loading: false,
        authenticated: false,
        user: null,
        error: error.message,
      });
      return null;
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const value = useMemo(() => ({ ...session, refresh }), [refresh, session]);
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error("useSession must be used inside SessionProvider");
  return context;
}
