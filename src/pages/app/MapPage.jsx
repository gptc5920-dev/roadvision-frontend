import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PageHeader,
  MetricCard,
  Panel,
  StatusBadge,
} from "../../components/ui/Page";
import {
  ErrorBlock,
  LoadingBlock,
  EmptyState,
} from "../../components/ui/Feedback";
import { useApi } from "../../hooks/useApi";
import { endpoints } from "../../services/api";
import { formatDate } from "../../utils/format";

const GeographicMap = lazy(() =>
  import("../../components/ui/GeographicMap").then((module) => ({
    default: module.GeographicMap,
  })),
);

export function MapPage() {
  const { data, loading, error, reload } = useApi(endpoints.reports, {
    interval: 10000,
  });
  const [selectedKey, setSelectedKey] = useState(null);
  const points = useMemo(
    () =>
      [
        ...(data?.reports || []).map((report) => ({
          ...report,
          key: `report-${report.id}`,
          code: `#${report.id}`,
          detailUrl: `/app/dispatch?report=${report.id}`,
        })),
        ...(data?.detections || []).map((track) => ({
          ...track,
          key: `track-${track.id}`,
          detailUrl: `/app/detections?analysis=${track.analysisId}&track=${track.id}`,
        })),
      ].filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lng) &&
          Math.abs(point.lat) <= 90 &&
          Math.abs(point.lng) <= 180,
      ),
    [data],
  );
  const selected = points.find((point) => point.key === selectedKey);
  return (
    <div className="page">
      <PageHeader
        eyebrow="Geospatial operations"
        title="Live map"
        copy="Locate road reports and GPS-tagged survey defects, inspect evidence, and open field directions."
      />
      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingBlock />
      ) : (
        <>
          <section className="metric-grid metric-grid--three">
            <MetricCard
              label="Mapped incidents"
              value={points.length}
              icon="map"
            />
            <MetricCard
              label="Open response"
              value={
                points.filter((point) =>
                  ["open", "unresolved"].includes(point.status),
                ).length
              }
              tone="orange"
              icon="alert"
            />
            <MetricCard
              label="Critical priority"
              value={
                points.filter((point) => point.severity === "critical").length
              }
              tone="red"
              icon="activity"
            />
          </section>
          <div className="map-layout">
            <section className="operations-map">
              <Suspense fallback={<LoadingBlock label="Opening map" />}>
                <GeographicMap
                  points={points}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                />
              </Suspense>
              {selected && (
                <article className="map-popover">
                  <button
                    onClick={() => setSelectedKey(null)}
                    aria-label="Close incident"
                  >
                    ?
                  </button>
                  <StatusBadge value={selected.severity} />
                  <h3>
                    {selected.code} ? {selected.city}
                  </h3>
                  <p>{selected.notes || "No incident notes."}</p>
                  <small>
                    {selected.deviceId} ? {formatDate(selected.detectedAt)}
                  </small>
                  <p className="map-coordinates">
                    {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                  </p>
                  <div className="panel__actions">
                    <Link
                      className="button button--primary"
                      to={selected.detailUrl}
                    >
                      Open details
                    </Link>
                    <a
                      className="button button--secondary"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selected.lat},${selected.lng}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get directions
                    </a>
                  </div>
                </article>
              )}
            </section>
            <Panel
              title="Map incidents"
              copy={`${points.length} incidents with valid coordinates`}
              className="map-side-panel"
            >
              <div className="incident-list">
                {points.map((point) => (
                  <button
                    key={point.key}
                    className={selectedKey === point.key ? "is-active" : ""}
                    onClick={() => setSelectedKey(point.key)}
                  >
                    <span
                      className={`record-dot record-dot--${point.severity}`}
                    />
                    <div>
                      <strong>
                        {point.code} ? {point.city}
                      </strong>
                      <p>{point.notes || point.deviceId}</p>
                    </div>
                    <StatusBadge value={point.status} />
                  </button>
                ))}
              </div>
              {!points.length && (
                <EmptyState
                  icon="map"
                  title="No mapped incidents"
                  copy="Reports and survey defects appear here when valid GPS coordinates are available."
                  to="/app/fleet"
                  actionLabel="View fleet cameras"
                />
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
