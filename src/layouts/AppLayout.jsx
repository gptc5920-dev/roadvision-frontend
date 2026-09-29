import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSession } from "../app/SessionContext";
import { Brand } from "../components/brand/Brand";
import { Icon } from "../components/icons/Icon";
import { apiFetch, endpoints } from "../services/api";

const primaryNav = [
  ["dashboard", "Dashboard", "dashboard"],
  ["map", "Live map", "map"],
  ["detections", "Defect inventory", "alert"],
  ["dispatch", "Dispatch", "truck"],
  ["fleet", "Fleet cameras", "camera"],
  ["analyzer", "Video analyzer", "video"],
];
const managementNav = [
  ["dataset", "Training dataset", "dataset"],
  ["sources", "Data sources", "database"],
  ["personnel", "Personnel", "users"],
  ["settings", "Settings", "settings"],
];

function NavigationGroup({ label, items, onNavigate }) {
  return (
    <div className="app-nav__group">
      <span>{label}</span>
      {items.map(([path, text, icon]) => (
        <NavLink
          key={path}
          to={`/app/${path}`}
          onClick={onNavigate}
          title={text}
        >
          <Icon name={icon} />
          <b>{text}</b>
        </NavLink>
      ))}
    </div>
  );
}

export function AppLayout() {
  const { user, refresh } = useSession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 980px)").matches,
  );
  const navRef = useRef(null);
  const menuRef = useRef(null);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("rv-nav-collapsed") === "true",
  );
  useEffect(() => {
    localStorage.setItem("rv-nav-collapsed", String(collapsed));
  }, [collapsed]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 980px)");
    const change = () => {
      setMobile(query.matches);
      setMobileOpen(false);
    };
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!mobile || !mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navRef.current?.querySelector("button")?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const items = navRef.current?.querySelectorAll(
        "a[href], button:not(:disabled)",
      );
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      menuRef.current?.focus();
    };
  }, [mobile, mobileOpen]);
  async function signOut() {
    await apiFetch(endpoints.logout, { method: "POST" });
    await refresh();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className={`app-frame${collapsed ? " app-frame--collapsed" : ""}${mobileOpen ? " app-frame--nav-open" : ""}`}
    >
      <aside
        ref={navRef}
        id="app-navigation"
        className="app-nav"
        aria-label="Primary navigation"
        inert={mobile && !mobileOpen}
      >
        <div className="app-nav__brand">
          <Brand to="/app/dashboard" inverse />
          <button
            className="icon-button app-nav__mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav>
          <NavigationGroup
            label="Operations"
            items={primaryNav}
            onNavigate={() => setMobileOpen(false)}
          />
          <NavigationGroup
            label="Management"
            items={managementNav}
            onNavigate={() => setMobileOpen(false)}
          />
        </nav>
        <div className="app-user">
          <span>{user?.initials}</span>
          <div>
            <strong>{user?.name}</strong>
            <small>{user?.role}</small>
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <button
        className="app-frame__backdrop"
        onClick={() => setMobileOpen(false)}
        aria-label="Close navigation"
      />
      <div className="app-main" inert={mobile && mobileOpen}>
        <header className="app-header">
          <button
            className="icon-button"
            ref={menuRef}
            onClick={() =>
              mobile ? setMobileOpen(true) : setCollapsed((value) => !value)
            }
            aria-label="Toggle navigation"
            aria-controls="app-navigation"
            aria-expanded={mobile ? mobileOpen : !collapsed}
          >
            <Icon name="menu" />
          </button>
          <form
            className="app-search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search roads, reports, devices…"
              aria-label="Search current page"
              onChange={(event) =>
                window.dispatchEvent(
                  new CustomEvent("roadvision:search", {
                    detail: event.target.value,
                  }),
                )
              }
            />
            <kbd>⌘ K</kbd>
          </form>
          <div className="app-header__meta">
            <span>
              <i />
              System online
            </span>
            <button onClick={signOut}>Sign out</button>
          </div>
        </header>
        <main className="app-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
