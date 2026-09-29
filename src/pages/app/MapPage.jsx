import { useMemo, useState } from "react";
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

export function MapPage() {
  const { data, loading, error, reload } = useApi(endpoints.reports);
  const [selected, setSelected] = useState(null);
  const bounds = useMemo(() => {
    const reports = data?.reports || [];
    if (!reports.length) return null;
    const lat = reports.map((report) => report.lat),
      lng = reports.map((report) => report.lng);
    return {
      minLat: Math.min(...lat),
      maxLat: Math.max(...lat),
      minLng: Math.min(...lng),
      maxLng: Math.max(...lng),
    };
  }, [data]);
  function position(report) {
    if (!bounds) return { left: "50%", top: "50%" };
    const lngRange = bounds.maxLng - bounds.minLng || 1,
      latRange = bounds.maxLat - bounds.minLat || 1;
    return {
      left: `${8 + ((report.lng - bounds.minLng) / lngRange) * 84}%`,
      top: `${8 + (1 - (report.lat - bounds.minLat) / latRange) * 84}%`,
    };
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Geospatial operations"
        title="Live map"
        copy="Locate road incidents, inspect severity, and prepare field routes from one operational view."
      />
      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingBlock />
      ) : (
        <>
          <section className="metric-grid metric-grid--three">
            <MetricCard
              label="Mapped reports"
              value={data.counts.total}
              icon="map"
            />
            <MetricCard
              label="Open response"
              value={data.counts.open}
              tone="orange"
              icon="alert"
            />
            <MetricCard
              label="Critical priority"
              value={data.counts.critical}
              tone="red"
              icon="activity"
            />
          </section>
          <div className="map-layout">
            <section className="operations-map">
              <div className="operations-map__grid" />
              <svg viewBox="0 0 1000 650" preserveAspectRatio="none">
                <path d="M-30 510C150 450 190 170 410 230s255 250 400 95 85-230 230-250" />
                <path d="M30 40c150 80 260 75 350 215s140 285 310 300 230-80 350-65" />
                <path d="M280-20c-45 180 45 245 75 380s-40 190-95 320" />
              </svg>
              {data.reports.map((report) => (
                <button
                  key={report.id}
                  className={`operations-pin operations-pin--${report.severity}${selected?.id === report.id ? " is-active" : ""}`}
                  style={position(report)}
                  onClick={() => setSelected(report)}
                  aria-label={`${report.severity} report in ${report.city}`}
                >
                  <span>{report.id}</span>
                </button>
              ))}
              {!data.reports.length && (
                <EmptyState
                  icon="map"
                  title="No mapped reports"
                  copy="Reports with coordinates will be plotted here."
                />
              )}
              {selected && (
                <article className="map-popover">
                  <button onClick={() => setSelected(null)} aria-label="Close">
                    ×
                  </button>
                  <StatusBadge value={selected.severity} />
                  <h3>{selected.city}</h3>
                  <p>{selected.notes || "No incident notes."}</p>
                  <small>
                    {selected.deviceId} · {formatDate(selected.detectedAt)}
                  </small>
                </article>
              )}
            </section>
            <Panel
              title="Map incidents"
              copy={`${data.reports.length} visible reports`}
              className="map-side-panel"
            >
              <div className="incident-list">
                {data.reports.map((report) => (
                  <button key={report.id} onClick={() => setSelected(report)}>
                    <span
                      className={`record-dot record-dot--${report.severity}`}
                    />
                    <div>
                      <strong>
                        #{report.id} · {report.city}
                      </strong>
                      <p>{report.notes || report.deviceId}</p>
                    </div>
                    <StatusBadge value={report.status} />
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
