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

export function DashboardPage() {
  const { data, loading, error, reload } = useApi(endpoints.overview);
  return (
    <div className="page">
      <PageHeader
        eyebrow="Network overview"
        title="Dashboard"
        copy="Live operational picture across road reports, survey vehicles, and reviewed video defects."
        actions={
          <Link className="button button--primary" to="/app/analyzer">
            Analyze footage
          </Link>
        }
      />
      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingBlock />
      ) : (
        <>
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
                    copy="Reports will appear here once field data is available."
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
                    copy="Incoming road reports will appear here."
                  />
                )}
              </div>
            </Panel>
          </div>
          <Panel
            title="Recent analysis runs"
            copy="Latest video processing activity"
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
                />
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
