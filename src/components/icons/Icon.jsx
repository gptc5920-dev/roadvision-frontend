const paths = {
  dashboard: ["M4 4h6v7H4z", "M14 4h6v4h-6z", "M14 12h6v8h-6z", "M4 15h6v5H4z"],
  map: ["M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z", "M9 3v15", "M15 6v15"],
  alert: ["M12 3 2.5 20h19L12 3Z", "M12 9v5", "M12 17h.01"],
  truck: [
    "M3 7h11v9H3z",
    "M14 10h4l3 3v3h-7z",
    "M6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    "M17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  ],
  camera: ["M4 7h3l2-3h6l2 3h3v13H4z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  video: ["M4 6h11v12H4z", "m15 10 5-3v10l-5-3z"],
  dataset: ["M4 5h16v14H4z", "M8 9h3v3H8z", "M14 9h2", "M14 13h3", "M8 16h8"],
  database: [
    "M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Z",
    "M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6",
    "M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6",
  ],
  users: [
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M2.5 21a6.5 6.5 0 0 1 13 0",
    "M17 11a3 3 0 1 0 0-6",
    "M18 15a5 5 0 0 1 3.5 6",
  ],
  settings: [
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1A7 7 0 0 0 15 6l-.4-2.6h-4L10 6a7 7 0 0 0-1.5 1L6 6 4 9.4 6.1 11a7 7 0 0 0 0 2L4 14.6 6 18l2.5-1a7 7 0 0 0 1.5 1l.6 2.6h4L15 18a7 7 0 0 0 1.5-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z",
  ],
  search: ["m21 21-4.35-4.35", "M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"],
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
  activity: ["M3 12h4l2.5-7 5 14 2.5-7h4"],
  shield: [
    "M12 3 4.5 6v5.5c0 4.5 3 7.8 7.5 9.5 4.5-1.7 7.5-5 7.5-9.5V6L12 3Z",
    "m9 12 2 2 4-5",
  ],
  upload: ["M12 16V4", "m7 9 5-5 5 5", "M5 20h14"],
  close: ["m6 6 12 12", "M18 6 6 18"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  play: ["m8 5 11 7-11 7z"],
  check: ["m5 12 4 4L19 6"],
  refresh: [
    "M20 7v5h-5",
    "M4 17v-5h5",
    "M18.5 9A7 7 0 0 0 6 6.5L4 9",
    "M5.5 15A7 7 0 0 0 18 17.5L20 15",
  ],
  chevron: ["m9 18 6-6-6-6"],
  logout: ["M10 5H5v14h5", "M14 8l4 4-4 4", "M18 12H9"],
};

export function Icon({ name, size = 20, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {(paths[name] || []).map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}
