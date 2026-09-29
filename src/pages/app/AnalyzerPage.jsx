import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/icons/Icon";
import {
  PageHeader,
  MetricCard,
  Panel,
  ProgressBar,
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
import { formatDate, formatDuration, formatPercent } from "../../utils/format";

const activeStatuses = new Set(["queued", "retrying", "running"]);

export function AnalyzerPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("analysis");
  const path = `${endpoints.analyzer}${selectedId ? `?analysis=${selectedId}` : ""}`;
  const query = useApi(path, {
    interval: 4000,
    pollWhen: (data) =>
      data?.analyses?.some((analysis) => activeStatuses.has(analysis.status)),
  });
  const action = useAction();
  const [uploading, setUploading] = useState(false);
  const selected = query.data?.selected;
  const source =
    selected?.media.processed ||
    selected?.media.original ||
    selected?.media.live;
  const isLiveImage =
    selected?.media.live &&
    !selected?.media.processed &&
    !selected?.media.original;
  const queue = query.data?.analyses || [];
  const configuredConfidence =
    query.data?.configuration.confidenceThreshold || 30;

  async function upload(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "upload_video");
    const result = await action.run(() => submitAction("analyzer", body));
    if (result?.ok) {
      setUploading(false);
      const refreshed = await query.reload();
      if (refreshed?.analyses?.[0])
        setParams({ analysis: refreshed.analyses[0].id });
    }
  }
  async function runAction(name, extra = {}) {
    const body = new FormData();
    body.set("action", name);
    body.set("analysis_id", selected.id);
    Object.entries(extra).forEach(([key, value]) => body.set(key, value));
    const result = await action.run(() => submitAction("analyzer", body));
    if (result?.ok) await query.reload();
  }
  const severity = useMemo(
    () =>
      (selected?.tracks || []).reduce(
        (result, track) => ({
          ...result,
          [track.severity]: (result[track.severity] || 0) + 1,
        }),
        {},
      ),
    [selected],
  );

  return (
    <div className="page page--wide">
      <PageHeader
        eyebrow="AI-assisted road survey"
        title="Video analyzer"
        copy="Upload, process, review, and export road-condition footage without leaving the operations console."
        actions={
          <button
            className="button button--primary"
            onClick={() => setUploading(true)}
          >
            <Icon name="upload" size={17} />
            Upload and analyze
          </button>
        }
      />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {query.error ? (
        <ErrorBlock message={query.error} onRetry={query.reload} />
      ) : query.loading ? (
        <LoadingBlock />
      ) : (
        <div className="analyzer-layout">
          <section className="analyzer-main">
            {selected ? (
              <>
                <Panel className="analysis-stage-panel">
                  <div className="analysis-title">
                    <div>
                      <StatusBadge value={selected.status} />
                      <h2>{selected.name}</h2>
                      <p>
                        {selected.roadSection || "Road section not assigned"}
                        {selected.chainageStation
                          ? ` · ${selected.chainageStation}`
                          : ""}
                      </p>
                    </div>
                    <div className="analysis-title__actions">
                      {activeStatuses.has(selected.status) && (
                        <button
                          className="button button--danger"
                          onClick={() =>
                            runAction(
                              selected.isContinuous
                                ? "stop_continuous_analysis"
                                : "cancel_analysis",
                            )
                          }
                          disabled={action.pending}
                        >
                          {selected.isContinuous
                            ? "Stop live analysis"
                            : "Cancel"}
                        </button>
                      )}
                      {["failed", "cancelled"].includes(selected.status) && (
                        <button
                          className="button button--secondary"
                          onClick={() => runAction("retry_analysis")}
                          disabled={action.pending}
                        >
                          <Icon name="refresh" size={16} />
                          Retry
                        </button>
                      )}
                      {["complete", "failed", "cancelled"].includes(
                        selected.status,
                      ) && (
                        <button
                          className="button button--secondary"
                          onClick={() => runAction("restart_analysis")}
                          disabled={action.pending}
                        >
                          Restart
                        </button>
                      )}
                      {selected.media.csv && (
                        <a
                          className="button button--secondary"
                          href={selected.media.csv}
                        >
                          Export CSV
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="video-stage">
                    {source ? (
                      isLiveImage ? (
                        <img
                          src={`${source}?t=${Date.now()}`}
                          alt="Latest live analysis frame"
                        />
                      ) : (
                        <video controls playsInline src={source} />
                      )
                    ) : (
                      <div className="video-stage__empty">
                        <Icon name="video" size={34} />
                        <strong>
                          {activeStatuses.has(selected.status)
                            ? "Processing video"
                            : "Video preview unavailable"}
                        </strong>
                        <p>
                          {selected.error ||
                            "The source will appear when processing produces a browser-ready preview."}
                        </p>
                      </div>
                    )}
                    <div className="video-hud">
                      <span>{selected.processingFps.toFixed(1)} FPS</span>
                      <span>{selected.uniquePotholes} defects</span>
                    </div>
                  </div>
                  {activeStatuses.has(selected.status) && (
                    <ProgressBar
                      value={selected.progress}
                      label={`${selected.framesProcessed} of ${selected.frameCount || "?"} frames`}
                    />
                  )}
                </Panel>
                <section className="metric-grid">
                  <MetricCard
                    label="Unique potholes"
                    value={selected.uniquePotholes}
                    icon="alert"
                  />
                  <MetricCard
                    label="Total detections"
                    value={selected.totalDetections}
                    tone="blue"
                    icon="activity"
                  />
                  <MetricCard
                    label="Average confidence"
                    value={formatPercent(selected.averageConfidence, 1)}
                    tone="green"
                    icon="check"
                  />
                  <MetricCard
                    label="Real-time factor"
                    value={`${selected.realtimeFactor.toFixed(2)}×`}
                    tone="slate"
                    icon="video"
                  />
                </section>
                <Panel
                  title="Detected tracks"
                  copy={`${selected.tracks.length} unique objects · ${severity.critical || 0} critical`}
                >
                  <div className="track-grid">
                    {selected.tracks.length ? (
                      selected.tracks.map((track) => (
                        <article key={track.id}>
                          {track.snapshotCropUrl ? (
                            <img
                              src={track.snapshotCropUrl}
                              alt="Pothole detection crop"
                            />
                          ) : (
                            <span className="track-card__placeholder">
                              <Icon name="alert" />
                            </span>
                          )}
                          <div>
                            <span>
                              <strong>{track.code}</strong>
                              <StatusBadge value={track.severity} />
                            </span>
                            <p>
                              {track.roadSection || "Unassigned road section"}
                            </p>
                            <small>
                              {formatDuration(track.firstTimestamp)} ·{" "}
                              {formatPercent(track.averageConfidence, 1)}{" "}
                              confidence
                            </small>
                          </div>
                        </article>
                      ))
                    ) : (
                      <EmptyState
                        icon="alert"
                        title="No unique tracks"
                        copy="Tracks will appear as the analysis detects road defects."
                      />
                    )}
                  </div>
                </Panel>
              </>
            ) : (
              <EmptyState
                icon="video"
                title="No analysis selected"
                copy="Upload a video or select a run from the queue."
                action={
                  <button
                    className="button button--primary"
                    onClick={() => setUploading(true)}
                  >
                    Upload footage
                  </button>
                }
              />
            )}
          </section>
          <aside className="analyzer-queue">
            <Panel title="Analysis queue" copy={`${queue.length} recent runs`}>
              <div className="queue-list">
                {queue.map((analysis) => (
                  <button
                    key={analysis.id}
                    className={selected?.id === analysis.id ? "is-active" : ""}
                    onClick={() => setParams({ analysis: analysis.id })}
                  >
                    <span className="queue-file">
                      {analysis.sourceType === "live-stream" ? "LIVE" : "MP4"}
                    </span>
                    <div>
                      <strong>{analysis.name}</strong>
                      <p>{formatDate(analysis.createdAt)}</p>
                    </div>
                    <StatusBadge value={analysis.status} />
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Active configuration">
              <dl className="key-values">
                <div>
                  <dt>Model</dt>
                  <dd>{query.data.configuration.model || "None"}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{query.data.configuration.confidenceThreshold}%</dd>
                </div>
                <div>
                  <dt>Resolution</dt>
                  <dd>{query.data.configuration.inputResolution}px</dd>
                </div>
                <div>
                  <dt>Tracker</dt>
                  <dd>{query.data.configuration.tracker}</dd>
                </div>
              </dl>
              {!query.data.configuration.ready && (
                <div className="inline-warning">
                  Model readiness is blocking new analyses.
                </div>
              )}
              <Link className="text-link" to="/app/settings">
                Manage configuration
              </Link>
            </Panel>
          </aside>
        </div>
      )}
      <Modal
        pending={action.pending}
        notice={action.notice}
        fields={action.fields}
        open={uploading}
        onClose={() => setUploading(false)}
        title="Upload and analyze"
        copy="Add survey footage and enough route context for engineering review."
        wide
      >
        <form className="form modal-form" onSubmit={upload}>
          <div className="upload-drop">
            <Icon name="upload" size={28} />
            <strong>Select road survey footage</strong>
            <p>MP4, MOV, AVI, MKV, or WebM</p>
            <input type="file" name="video" accept="video/*" required />
          </div>
          <div className="form-grid">
            <input type="hidden" name="source_type" value="upload" />
            <label>
              Road section
              <input
                name="road_section"
                placeholder="Commonwealth Avenue"
                maxLength="180"
                required
              />
            </label>
            <label>
              Chainage / station
              <input
                name="chainage_station"
                placeholder="CH 10+250"
                maxLength="80"
              />
            </label>
            <label>
              Detection sensitivity
              <select
                name="confidence_threshold"
                defaultValue={configuredConfidence}
              >
                {![25, 30, 35, 50].includes(configuredConfidence) && (
                  <option value={configuredConfidence}>
                    System default · {configuredConfidence}%
                  </option>
                )}
                <option value="25">High recall · 25%</option>
                <option value="30">Standard · 30%</option>
                <option value="35">Conservative · 35%</option>
                <option value="50">Strict · 50%</option>
              </select>
            </label>
            <label>
              GPS track file
              <input type="file" name="gps_file" accept=".csv,.gpx,.json" />
            </label>
            <label>
              Calibration m/pixel
              <input
                type="number"
                min="0.000001"
                max="1"
                step="0.000001"
                name="calibration_m_per_pixel"
              />
            </label>
            <label>
              Calibration notes
              <input name="calibration_notes" maxLength="255" />
            </label>
          </div>
          <footer>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setUploading(false)}
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={action.pending}
            >
              {action.pending ? "Uploading…" : "Upload and start analysis"}
            </button>
          </footer>
        </form>
      </Modal>
    </div>
  );
}
