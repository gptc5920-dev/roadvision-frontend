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
  Notice,
} from "../../components/ui/Feedback";
import { useAction, useApi } from "../../hooks/useApi";
import { endpoints, submitAction } from "../../services/api";
import { formatDate } from "../../utils/format";

export function DispatchPage() {
  const query = useApi(endpoints.reports);
  const action = useAction(query.reload);
  async function update(reportId, status) {
    const body = new FormData();
    body.set("action", "update_report_status");
    body.set("report_id", reportId);
    body.set("status", status);
    await action.run(() => submitAction("dispatch", body));
  }
  const active =
    query.data?.reports.filter((report) => report.status !== "resolved") || [];
  return (
    <div className="page">
      <PageHeader
        eyebrow="Field response"
        title="Dispatch"
        copy="Move verified incidents from open report to active repair and resolution."
      />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {query.error ? (
        <ErrorBlock message={query.error} onRetry={query.reload} />
      ) : query.loading ? (
        <LoadingBlock />
      ) : (
        <>
          <section className="metric-grid metric-grid--three">
            <MetricCard
              label="Awaiting dispatch"
              value={query.data.counts.open}
              icon="truck"
              tone="orange"
            />
            <MetricCard
              label="Critical incidents"
              value={query.data.counts.critical}
              icon="alert"
              tone="red"
            />
            <MetricCard
              label="Active work items"
              value={active.length}
              icon="activity"
            />
          </section>
          <div className="dispatch-grid">
            {active.length ? (
              active.map((report) => (
                <Panel key={report.id} className="dispatch-card">
                  <div className="dispatch-card__top">
                    <span
                      className={`dispatch-priority dispatch-priority--${report.severity}`}
                    >
                      {report.severity}
                    </span>
                    <StatusBadge value={report.status} />
                  </div>
                  <h3>
                    #{report.id} · {report.city}
                  </h3>
                  <p>{report.notes || "No field notes provided."}</p>
                  <dl>
                    <div>
                      <dt>Source</dt>
                      <dd>{report.deviceId}</dd>
                    </div>
                    <div>
                      <dt>Detected</dt>
                      <dd>{formatDate(report.detectedAt)}</dd>
                    </div>
                    <div>
                      <dt>Coordinates</dt>
                      <dd>
                        {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
                      </dd>
                    </div>
                  </dl>
                  <div className="dispatch-card__actions">
                    <button
                      className="button button--secondary"
                      disabled={action.pending || report.status === "open"}
                      onClick={() => update(report.id, "open")}
                    >
                      Open
                    </button>
                    <button
                      className="button button--secondary"
                      disabled={
                        action.pending || report.status === "in-progress"
                      }
                      onClick={() => update(report.id, "in-progress")}
                    >
                      In progress
                    </button>
                    <button
                      className="button button--primary"
                      disabled={action.pending}
                      onClick={() => update(report.id, "resolved")}
                    >
                      Resolve
                    </button>
                  </div>
                </Panel>
              ))
            ) : (
              <EmptyState
                icon="truck"
                title="Dispatch queue is clear"
                copy="New verified incidents will appear here for assignment."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
