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

export function SourcesPage() {
  const query = useApi(endpoints.sources);
  const action = useAction(query.reload);
  async function add(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "add_sample");
    const result = await action.run(() =>
      submitAction("detection-sources", body),
    );
    if (result?.ok) event.currentTarget.reset();
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Survey library"
        title="Data sources"
        copy="Maintain reusable survey clips and road metadata for repeatable analysis workflows."
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
              label="Survey sources"
              value={query.data.sources.length}
              icon="database"
            />
            <MetricCard
              label="Recent analyses"
              value={query.data.recentAnalyses.length}
              icon="video"
              tone="blue"
            />
            <MetricCard
              label="Cities covered"
              value={
                new Set(query.data.sources.map((source) => source.city)).size
              }
              icon="map"
              tone="green"
            />
          </section>
          <div className="sources-layout">
            <Panel title="Dataset sources">
              <div className="source-list">
                {query.data.sources.map((source) => (
                  <article key={source.id}>
                    <span className="source-icon">VID</span>
                    <div>
                      <strong>{source.name}</strong>
                      <p>
                        {source.road} · {source.city}
                      </p>
                      <small>
                        {source.duration}s · {source.frames} frames ·{" "}
                        {source.fps} FPS
                      </small>
                    </div>
                    <StatusBadge value="ready" label="Ready" />
                  </article>
                ))}
              </div>
              {!query.data.sources.length && (
                <EmptyState
                  icon="database"
                  title="No survey sources"
                  copy="Add the first source using the form beside this list."
                />
              )}
            </Panel>
            <Panel title="Add survey source">
              <form className="form" onSubmit={add}>
                <label>
                  Name
                  <input name="name" maxLength="160" required />
                </label>
                <label>
                  Road name
                  <input name="road_name" maxLength="160" required />
                </label>
                <div className="form-grid">
                  <label>
                    Barangay
                    <input name="barangay" maxLength="120" />
                  </label>
                  <label>
                    City
                    <input name="city" maxLength="120" required />
                  </label>
                  <label>
                    File name
                    <input name="file_name" maxLength="180" />
                  </label>
                  <label>
                    Duration seconds
                    <input
                      type="number"
                      name="duration_seconds"
                      defaultValue="40"
                      min="1"
                      max="604800"
                      required
                    />
                  </label>
                  <label>
                    Frame count
                    <input
                      type="number"
                      name="frame_count"
                      defaultValue="879"
                      min="1"
                      max="2147483647"
                      required
                    />
                  </label>
                  <label>
                    FPS
                    <input
                      type="number"
                      name="fps"
                      defaultValue="59"
                      step="0.01"
                      min="0.01"
                      max="999.99"
                      required
                    />
                  </label>
                </div>
                <label>
                  Notes
                  <textarea name="notes" maxLength="2000" />
                </label>
                <button
                  className="button button--primary"
                  disabled={action.pending}
                >
                  Add source
                </button>
              </form>
            </Panel>
          </div>
          <Panel title="Recent source analyses">
            <div className="record-list">
              {query.data.recentAnalyses.map((analysis) => (
                <article key={analysis.id}>
                  <span className="record-dot record-dot--low" />
                  <div>
                    <strong>
                      {analysis.name || `Analysis #${analysis.id}`}
                    </strong>
                    <p>
                      {analysis.road || "Unassigned road"} ·{" "}
                      {analysis.detections} detections
                    </p>
                  </div>
                  <div>
                    <StatusBadge value={analysis.status} />
                    <small>{formatDate(analysis.createdAt)}</small>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
