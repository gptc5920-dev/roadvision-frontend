import { useState } from "react";
import { Link } from "react-router-dom";
import { Panel, StatusBadge } from "../../components/ui/Page";
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Toast,
} from "../../components/ui/Feedback";
import { Modal } from "../../components/ui/Modal";
import { useAction, useApi } from "../../hooks/useApi";
import { endpoints, submitAction } from "../../services/api";
import { formatDate, titleCase } from "../../utils/format";

function localDateTime(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}

export function ReportsPage() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const params = new URLSearchParams({ limit: "50", offset: String(offset) });
  if (term) params.set("q", term);
  const query = useApi(`${endpoints.reportRecords}?${params}`);
  const action = useAction();
  const reports = query.data?.reports || [];
  const pagination = query.data?.pagination;
  const changingPage = Boolean(
    query.data && (pagination.offset !== offset || query.data.query !== term),
  );

  async function save(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "update_report");
    body.set("report_id", selected.id);
    body.set("detected_at", new Date(body.get("detected_at")).toISOString());
    setAttempted(true);
    const result = await action.run(() => submitAction("reports", body));
    if (result?.ok) {
      setSelected(null);
      await query.reload();
    }
  }

  return (
    <div className="page">
      <Toast
        notice={selected ? null : action.notice}
        onClose={() => action.setNotice(null)}
      />
      <Panel
        title="Reports"
        actions={
          <Link className="button button--secondary" to="/app/analyzer">
            Video analyzer
          </Link>
        }
      >
        <form
          className="form reports-search"
          role="search"
          aria-label="Search reports"
          onSubmit={(event) => {
            event.preventDefault();
            setTerm(search.trim());
            setOffset(0);
          }}
        >
          <label>
            Search reports
            <input
              type="search"
              value={search}
              placeholder="Report ID, city, device, or notes"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button className="button button--secondary">Search</button>
        </form>
        {query.error ? (
          <ErrorBlock message={query.error} onRetry={query.reload} />
        ) : query.loading || changingPage ? (
          <LoadingBlock />
        ) : reports.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Device</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Detected</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>
                        #{report.id} · {report.city}
                      </strong>
                      <small>{report.notes}</small>
                    </td>
                    <td>{report.deviceId}</td>
                    <td>
                      {report.lat}, {report.lng}
                    </td>
                    <td>
                      <StatusBadge value={report.severity} />
                    </td>
                    <td>
                      <StatusBadge value={report.status} />
                    </td>
                    <td>{formatDate(report.detectedAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          aria-label={`Edit report #${report.id}`}
                          onClick={() => {
                            action.setNotice(null);
                            setAttempted(false);
                            setSelected(report);
                          }}
                        >
                          Edit
                        </button>
                        <Link to={`/app/analyzer?report=${report.id}`}>
                          Video analysis
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="report"
            title={term ? "No matching reports" : "No reports yet"}
            copy={
              term
                ? "Try another report ID, city, device, or note."
                : "Create a road report in Video analyzer to start collecting footage."
            }
          />
        )}
        {pagination && !query.loading && !query.error && !changingPage && (
          <div className="reports-pagination">
            <span>
              {pagination.total
                ? `${Math.min(offset + 1, pagination.total)}–${Math.min(offset + pagination.limit, pagination.total)} of ${pagination.total}`
                : "0 reports"}
            </span>
            <button
              className="button button--secondary"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pagination.limit))}
            >
              Previous
            </button>
            <button
              className="button button--secondary"
              disabled={offset + pagination.limit >= pagination.total}
              onClick={() => setOffset(offset + pagination.limit)}
            >
              Next
            </button>
          </div>
        )}
      </Panel>
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Edit report #${selected?.id}`}
        wide
        pending={action.pending}
        notice={action.notice}
        fields={attempted ? action.fields : {}}
      >
        {selected && (
          <form key={selected.id} className="form modal-form" onSubmit={save}>
            <fieldset disabled={action.pending} className="report-fields">
              <div className="form-grid">
                <label>
                  City
                  <input
                    name="city"
                    maxLength="120"
                    defaultValue={selected.city}
                    required
                  />
                </label>
                <label>
                  Source device ID
                  <input
                    name="device_id"
                    maxLength="80"
                    defaultValue={selected.deviceId}
                    required
                  />
                </label>
                <label>
                  Latitude
                  <input
                    type="number"
                    name="lat"
                    min="-90"
                    max="90"
                    step="any"
                    defaultValue={selected.lat}
                    required
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    name="lng"
                    min="-180"
                    max="180"
                    step="any"
                    defaultValue={selected.lng}
                    required
                  />
                </label>
                <label>
                  Severity
                  <select name="severity" defaultValue={selected.severity}>
                    {["low", "medium", "high", "critical"].map((value) => (
                      <option key={value} value={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={selected.status}>
                    {["open", "in-progress", "resolved"].map((value) => (
                      <option key={value} value={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  Detected at
                  <input
                    type="datetime-local"
                    name="detected_at"
                    step="1"
                    defaultValue={localDateTime(selected.detectedAt)}
                    required
                  />
                </label>
                <label className="span-2">
                  Evidence image URL
                  <input
                    type="url"
                    name="image_url"
                    maxLength="200"
                    defaultValue={selected.imageUrl}
                  />
                </label>
                <label className="span-2">
                  Notes
                  <textarea
                    name="notes"
                    maxLength="2000"
                    rows="3"
                    defaultValue={selected.notes}
                  />
                </label>
              </div>
            </fieldset>
            <footer>
              <button
                type="button"
                className="button button--secondary"
                disabled={action.pending}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                disabled={action.pending}
              >
                {action.pending ? "Saving…" : "Save report"}
              </button>
            </footer>
          </form>
        )}
      </Modal>
    </div>
  );
}
