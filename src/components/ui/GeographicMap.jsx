import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const colors = {
  critical: "#bf3f3f",
  high: "#e66732",
  medium: "#a96618",
  moderate: "#a96618",
  low: "#246454",
};

export function GeographicMap({ points, selectedKey, onSelect }) {
  const container = useRef(null);
  const map = useRef(null);
  const markers = useRef(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
    }).setView([14.5995, 120.9842], 11);
    map.current = instance;
    markers.current = L.layerGroup().addTo(instance);
    const tiles = L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          import.meta.env.VITE_MAP_ATTRIBUTION ||
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(instance);
    tiles.on("tileerror", () => setTileError(true));
    tiles.on("tileload", () => setTileError(false));
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      markers.current = null;
    };
  }, []);
  const membership = points.map((point) => point.key).join(",");
  useEffect(() => {
    if (!map.current || !points.length) return;
    map.current.fitBounds(
      points.map((point) => [point.lat, point.lng]),
      { padding: [40, 40], maxZoom: 16 },
    );
  }, [membership]);
  useEffect(() => {
    if (!markers.current) return;
    markers.current.clearLayers();
    points.forEach((point) => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: point.key === selectedKey ? 11 : 8,
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
        fillColor: colors[point.severity] || colors.low,
      }).addTo(markers.current);
      marker.on("click", () => select.current(point.key));
      const element = marker.getElement();
      if (element) {
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.setAttribute(
          "aria-label",
          `${point.severity} ${point.code} in ${point.city}`,
        );
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            select.current(point.key);
          }
        });
      }
    });
    const selected = points.find((point) => point.key === selectedKey);
    if (selected) map.current.panTo([selected.lat, selected.lng]);
  }, [points, selectedKey]);
  return (
    <>
      <div
        className="geographic-map"
        ref={container}
        aria-label="Road incident map"
      />
      {tileError && (
        <p className="map-tile-warning" role="status">
          Map tiles are unavailable. Incident details and directions remain
          available.
        </p>
      )}
    </>
  );
}
