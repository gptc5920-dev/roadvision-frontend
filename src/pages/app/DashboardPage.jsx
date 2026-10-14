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
import { formatDate, formatNumber } from "../../utils/format";
import { Icon } from "../../components/icons/Icon";

export function DashboardPage() {
  const { data, loading, error, reload } = useApi(endpoints.overview);
  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="Network overview"
        title="Dashboard"
        copy="Live operational picture across road reports, survey vehicles, and reviewed video defects."
        actions={
          <>
            <Link className="button button--secondary" to="/app/map">
              <Icon name="map" size={17} /> View live map
            </Link>
            <Link className="button button--primary" to="/app/analyzer">
              <Icon name="upload" size={17} /> Analyze footage
            </Link>
          </>
        }
      />
      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingBlock />
      ) : (
        <>
          <section
            className="dashboard-brief"
            aria-labelledby="dashboard-brief-title"
          >
            <div className="dashboard-brief__copy">
              <span className="dashboard-brief__eyebrow">Your next step</span>
              <h2 id="dashboard-brief-title">
                {data.metrics.unresolvedDefects > 0
                  ? `${formatNumber(data.metrics.unresolvedDefects)} defects ready for review`
                  : "A clearer view of every road."}
              </h2>
              <p>
                {data.metrics.unresolvedDefects > 0
                  ? "Review detection evidence and confirm defects to keep field response moving."
                  : "Analyze survey footage, inspect detections, and coordinate your next field response."}
              </p>
              <Link
                to={
                  data.metrics.unresolvedDefects > 0
                    ? "/app/detections"
                    : "/app/analyzer"
                }
              >
                {data.metrics.unresolvedDefects > 0
                  ? "Review defect inventory"
                  : "Start an analysis"}
                <Icon name="arrow" size={18} />
              </Link>
            </div>
            <div className="dashboard-brief__routes">
              <Link to="/app/map">
                <span>
                  <Icon name="map" />
                </span>
                <div>
                  <strong>Explore the network</strong>
                  <small>Locate reports on the live map</small>
                </div>
                <Icon name="chevron" size={16} />
              </Link>
              <Link to="/app/dispatch">
                <span>
                  <Icon name="truck" />
                </span>
                <div>
                  <strong>Coordinate repairs</strong>
                  <small>Manage dispatch and field response</small>
                </div>
                <Icon name="chevron" size={16} />
              </Link>
            </div>
          </section>
          <section className="metric-grid">
            <MetricCard
              label="Open reports"
              value={formatNumber(data.metrics.openReports)}
              detail={`${data.metrics.criticalReports} critical`}
              tone="orange"
              icon="alert"
            />
            <MetricCard
              label="Confirmed defects"
              value={formatNumber(data.metrics.confirmedDefects)}
              detail={`${data.metrics.unresolvedDefects} awaiting review`}
              tone="green"
              icon="check"
            />
            <MetricCard
              label="Fleet online"
              value={formatNumber(data.metrics.onlineVehicles)}
              detail={`${data.metrics.averageFleetFps} average FPS`}
              tone="blue"
              icon="camera"
            />
            <MetricCard
              label="Reports recorded"
              value={formatNumber(data.metrics.reports)}
              detail="All-time field inventory"
              tone="slate"
              icon="map"
            />
          </section>
          <div className="dashboard-grid">
            <Panel title="City load" copy="Current report volume by city">
              <div className="bar-list">
                {data.cityCounts.length ? (
                  data.cityCounts.map((item) => (
                    <div key={item.city}>
                      <span>{item.city || "Unassigned"}</span>
                      <div>
                        <i
                          style={{
                            width: `${Math.max(8, (item.total / Math.max(...data.cityCounts.map((row) => row.total))) * 100)}%`,
                          }}
                        />
                      </div>
                      <strong>{item.total}</strong>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No city data"
                    copy="Connect survey cameras to start collecting road reports."
                    to="/app/fleet"
                    actionLabel="View fleet cameras"
                  />
                )}
              </div>
            </Panel>
            <Panel
              title="Recent reports"
              actions={
                <Link className="text-link" to="/app/map">
                  View map
                </Link>
              }
            >
              <div className="record-list">
                {data.recentReports.length ? (
                  data.recentReports.map((report) => (
                    <article key={report.id}>
                      <span
                        className={`record-dot record-dot--${report.severity}`}
                      />
                      <div>
                        <strong>{report.city}</strong>
                        <p>{report.notes || report.deviceId}</p>
                      </div>
                      <div>
                        <StatusBadge value={report.status} />
                        <small>{formatDate(report.detectedAt)}</small>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title="No reports yet"
                    copy="Check your fleet cameras to begin receiving road reports."
                    to="/app/fleet"
                    actionLabel="View fleet cameras"
                  />
                )}
              </div>
            </Panel>
          </div>
          <Panel
            title="Recent analysis runs"
            copy="Latest video processing activity"
            actions={
              <Link className="text-link" to="/app/analyzer">
                All analyses <Icon name="arrow" size={15} />
              </Link>
            }
          >
            <div className="analysis-list">
              {data.recentAnalyses.length ? (
                data.recentAnalyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    to={`/app/analyzer?analysis=${analysis.id}`}
                  >
                    <span className="analysis-file-icon">MP4</span>
                    <div>
                      <strong>{analysis.name}</strong>
                      <p>
                        {analysis.roadSection || "Road section not assigned"} ·{" "}
                        {formatDate(analysis.createdAt)}
                      </p>
                    </div>
                    <StatusBadge value={analysis.status} />
                    <b>{analysis.uniquePotholes} defects</b>
                  </Link>
                ))
              ) : (
                <EmptyState
                  icon="video"
                  title="No analysis runs"
                  copy="Upload survey footage to start the first analysis."
                  to="/app/analyzer"
                  actionLabel="Analyze footage"
                />
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
