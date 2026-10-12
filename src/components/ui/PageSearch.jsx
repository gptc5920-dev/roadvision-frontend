import { useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";

export function PageSearch({ pages }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const input = useRef(null);
  const resultsId = useId();
  const hintId = useId();
  const term = query.trim().toLowerCase();
  const matches = pages.filter(([path, label]) =>
    `${path} ${label}`.toLowerCase().includes(term),
  );
  const open = focused && Boolean(term);

  return (
    <div
      className="page-search"
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          input.current?.focus();
          setFocused(false);
        }
      }}
    >
      <form
        className="app-search"
        role="search"
        aria-label="Console pages"
        onSubmit={(event) => {
          event.preventDefault();
          if (term && matches.length) navigate(`/app/${matches[0][0]}`);
        }}
      >
        <Icon name="search" size={18} />
        <input
          ref={input}
          type="search"
          placeholder="Search…"
          aria-label="Search pages"
          aria-describedby={hintId}
          aria-controls={open ? resultsId : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setFocused(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && open) {
              const first = document
                .getElementById(resultsId)
                ?.querySelector("a");
              if (first) {
                event.preventDefault();
                first.focus();
              }
            }
          }}
        />
        <span id={hintId} className="app-search__scope">
          Pages
        </span>
      </form>
      {open && (
        <nav
          className="page-search__results"
          id={resultsId}
          aria-label="Page search results"
        >
          <p role="status">
            {matches.length
              ? `${matches.length} matching ${matches.length === 1 ? "page" : "pages"}`
              : "No matching pages. Try “map” or “dataset”."}
          </p>
          {matches.length > 0 && (
            <ul>
              {matches.map(([path, label, icon]) => (
                <li key={path}>
                  <Link to={`/app/${path}`}>
                    <Icon name={icon} size={18} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}
    </div>
  );
}
