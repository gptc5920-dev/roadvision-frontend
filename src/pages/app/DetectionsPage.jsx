import { useState } from "react";
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
import { Modal } from "../../components/ui/Modal";
import { useAction, useApi } from "../../hooks/useApi";
import { endpoints, submitAction } from "../../services/api";
import { formatNumber, formatPercent } from "../../utils/format";

export function DetectionsPage() {
  const query = useApi(endpoints.detections);
  const action = useAction(query.reload);
  const [selected, setSelected] = useState(null);
  async function save(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "review_track");
    const result = await action.run(() => submitAction("detections", body));
    if (result?.ok) setSelected(null);
  }
  async function remove(track) {
    if (!window.confirm(`Remove ${track.code} as a false detection?`)) return;
    const body = new FormData();
    body.set("action", "remove_track");
    body.set("track_id", track.id);
    await action.run(() => submitAction("detections", body));
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Review workflow"
        title="Defect inventory"
        copy="Confirm, measure, and resolve unique defects extracted from completed video analyses."
      />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {query.error ? (
        <ErrorBlock message={query.error} onRetry={query.reload} />
      ) : query.loading ? (
        <LoadingBlock />
      ) : (
        <>
          <section className="metric-grid">
            <MetricCard
              label="Unique defects"
              value={query.data.counts.total}
              icon="alert"
            />
            <MetricCard
              label="Awaiting review"
              value={query.data.counts.unresolved}
              tone="orange"
              icon="activity"
            />
            <MetricCard
              label="Confirmed"
              value={query.data.counts.confirmed}
              tone="green"
              icon="check"
            />
            <MetricCard
              label="Critical"
              value={query.data.counts.critical}
              tone="red"
              icon="alert"
            />
          </section>
          <Panel
            title="Detection records"
            copy={`${query.data.tracks.length} records loaded`}
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Defect</th>
                    <th>Preview</th>
                    <th>Road section</th>
                    <th>Confidence</th>
                    <th>Severity</th>
                    <th>Review</th>
                    <th>Measurements</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.tracks.map((track) => (
                    <tr key={track.id}>
                      <td>
                        <strong>{track.code}</strong>
                        <small>{track.label}</small>
                      </td>
                      <td>
                        {track.snapshotCropUrl ? (
                          <img
                            className="table-thumb"
                            src={track.snapshotCropUrl}
                            alt="Detected road defect"
                          />
                        ) : (
                          <span className="table-placeholder">No image</span>
                        )}
                      </td>
                      <td>{track.roadSection || "Unassigned"}</td>
                      <td>{formatPercent(track.averageConfidence, 1)}</td>
                      <td>
                        <StatusBadge value={track.severity} />
                      </td>
                      <td>
                        <StatusBadge value={track.reviewStatus} />
                      </td>
                      <td>
                        <small>
                          {track.estimatedAreaSqm !== null
                            ? `${formatNumber(track.estimatedAreaSqm, { maximumFractionDigits: 2 })} m²`
                            : track.measurementBasis}
                        </small>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button onClick={() => setSelected(track)}>
                            Review
                          </button>
                          <button
                            className="danger-link"
                            onClick={() => remove(track)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!query.data.tracks.length && (
              <EmptyState
                icon="alert"
                title="No video defects"
                copy="Completed video tracks will appear here for review."
              />
            )}
          </Panel>
        </>
      )}
      <Modal
        pending={action.pending}
        notice={action.notice}
        fields={action.fields}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Review ${selected.code}` : "Review defect"}
        copy="Record engineering disposition and optional field measurements."
      >
        {selected && (
          <form className="form modal-form" onSubmit={save}>
            <input type="hidden" name="track_id" value={selected.id} />
            <div className="form-grid">
              <label>
                Review status
                <select
                  name="review_status"
                  defaultValue={selected.reviewStatus}
                >
                  <option value="unresolved">Unresolved</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label>
                Severity
                <select name="severity" defaultValue={selected.severity}>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label className="span-2">
                Road section
                <input
                  name="road_section"
                  defaultValue={selected.roadSection}
                />
              </label>
              <label>
                Measured depth (mm)
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  name="measured_depth_mm"
                  defaultValue={selected.measuredDepthMm ?? ""}
                />
              </label>
              <label>
                Latitude
                <input
                  type="number"
                  step="0.0000001"
                  min="-90"
                  max="90"
                  name="latitude"
                  defaultValue={selected.latitude ?? ""}
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="0.0000001"
                  min="-180"
                  max="180"
                  name="longitude"
                  defaultValue={selected.longitude ?? ""}
                />
              </label>
              <label className="span-2">
                Remarks
                <textarea
                  name="remarks"
                  maxLength="2000"
                  defaultValue={selected.remarks}
                />
              </label>
            </div>
            <footer>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                disabled={action.pending}
              >
                {action.pending ? "Saving…" : "Save review"}
              </button>
            </footer>
          </form>
        )}
      </Modal>
    </div>
  );
}
