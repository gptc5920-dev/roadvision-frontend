import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/icons/Icon";
import {
  MetricCard,
  Panel,
  ProgressBar,
  StatusBadge,
} from "../../components/ui/Page";
import {
  ErrorBlock,
  LoadingBlock,
  EmptyState,
  Toast,
} from "../../components/ui/Feedback";
import { Modal } from "../../components/ui/Modal";
import { TrackPreview } from "../../components/ui/TrackPreview";
import { CameraCapture } from "../../components/ui/CameraCapture";
import { useAction, useApi } from "../../hooks/useApi";
import { endpoints, submitAction } from "../../services/api";
import { formatDate, formatDuration, formatPercent } from "../../utils/format";

const activeStatuses = new Set(["queued", "retrying", "running"]);

export function AnalyzerPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("analysis");
  const reportId = params.get("report");
  const queryParams = new URLSearchParams();
  if (reportId) queryParams.set("report", reportId);
  if (selectedId) queryParams.set("analysis", selectedId);
  const path = `${endpoints.analyzer}${queryParams.size ? `?${queryParams}` : ""}`;
  const query = useApi(path, {
    interval: 4000,
    pollWhen: (data) =>
      data?.analyses?.some((analysis) => activeStatuses.has(analysis.status)),
  });
  const action = useAction();
  const [uploading, setUploading] = useState(false);
  const [creatingReport, setCreatingReport] = useState(false);
  const [sourceType, setSourceType] = useState("upload");
  const [dashcamInput, setDashcamInput] = useState("file");
  const [capturedFile, setCapturedFile] = useState(null);
  const useCamera =
    ["laptop", "mobile"].includes(sourceType) ||
    (sourceType === "dashcam" && dashcamInput === "camera");
  const useStream =
    sourceType === "live-stream" ||
    (sourceType === "dashcam" && dashcamInput === "stream");
  const changingReport = Boolean(
    query.data &&
    (reportId
      ? String(query.data.report?.id) !== reportId
      : !selectedId && Boolean(query.data.report || query.data.selected)),
  );
  const changingAnalysis = Boolean(
    selectedId && query.data && String(query.data.selected?.id) !== selectedId,
  );
  const report = changingReport ? null : query.data?.report;
  const selected =
    changingReport || changingAnalysis ? null : query.data?.selected;
  const reports = query.data?.reports || [];
  const reportChoices =
    report && !reports.some((item) => item.id === report.id)
      ? [report, ...reports]
      : reports;
  const reportParams = report ? { report: String(report.id) } : {};
  const source =
    selected?.media.processed ||
    selected?.media.original ||
    selected?.media.live;
  const isLiveImage =
    selected?.media.live &&
    !selected?.media.processed &&
    !selected?.media.original;
  const unassigned = !report && !selected;
  const queue = unassigned
    ? query.data?.unassignedAnalyses || []
    : query.data?.analyses || [];
  const configuredConfidence =
    query.data?.configuration.confidenceThreshold || 30;

  function openUpload() {
    if (!report || query.loading || changingReport || changingAnalysis) return;
    setCapturedFile(null);
    setUploading(true);
  }
  function closeUpload() {
    setCapturedFile(null);
    setUploading(false);
  }
  async function createReport(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "create_report");
    const result = await action.run(() => submitAction("analyzer", body));
    if (result?.ok) {
      setCreatingReport(false);
      if (result.redirect) navigate(result.redirect);
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!report) return;
    const body = new FormData(event.currentTarget);
    body.set("action", "upload_video");
    body.set("report_id", report.id);
    body.set(
      "source_type",
      useStream
        ? "live-stream"
        : sourceType === "dashcam"
          ? "dashcam"
          : useCamera
            ? "webcam"
            : "upload",
    );
    if (sourceType !== "upload")
      body.set(
        "camera_source",
        sourceType === "live-stream" ? "stream" : sourceType,
      );
    if (useCamera) {
      if (!capturedFile) return;
      body.set("video", capturedFile, capturedFile.name);
    }
    const result = await action.run(() => submitAction("analyzer", body));
    if (result?.ok) {
      closeUpload();
      if (result.redirect) {
        navigate(result.redirect);
        await query.reload();
        return;
      }
      const refreshed = await query.reload();
      if (refreshed?.analyses?.[0])
        setParams({ ...reportParams, analysis: refreshed.analyses[0].id });
    }
  }
  async function runAction(name, extra = {}) {
    const body = new FormData();
    body.set("action", name);
    body.set("analysis_id", selected.id);
    if (report) body.set("report_id", report.id);
    Object.entries(extra).forEach(([key, value]) => body.set(key, value));
    const result = await action.run(() => submitAction("analyzer", body));
    if (result?.ok) await query.reload();
  }
  async function removeAnalysis(analysis) {
    if (
      !window.confirm(
        `Remove "${analysis.name}" and its detected tracks? This cannot be undone.`,
      )
    )
      return;
    const body = new FormData();
    body.set("action", "remove_analysis");
    body.set("analysis_id", analysis.id);
    if (report) body.set("report_id", report.id);
    const result = await action.run(() => submitAction("analyzer", body));
    if (result?.ok) {
      if (selected?.id === analysis.id || selectedId === String(analysis.id))
        setParams(reportParams);
      await query.reload();
    }
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
      <div className="page-header__actions page-actions">
        <label className="analysis-report-picker">
          Report
          <select
            value={reportId || report?.id || ""}
            disabled={action.pending}
            onChange={(event) => {
              closeUpload();
              setParams(
                event.target.value ? { report: event.target.value } : {},
              );
            }}
          >
            <option value="">Select a report</option>
            {reportChoices.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} · {item.city || "Road report"} · {item.deviceId}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button--secondary"
          disabled={action.pending}
          onClick={() => setCreatingReport(true)}
        >
          New report
        </button>
        <button
          className="button button--primary"
          onClick={openUpload}
          disabled={
            !report ||
            action.pending ||
            changingReport ||
            changingAnalysis ||
            query.loading
          }
        >
          <Icon name="upload" size={17} />
          Upload and analyze
        </button>
      </div>
      <Toast
        notice={uploading || creatingReport ? null : action.notice}
        onClose={() => action.setNotice(null)}
      />
      {query.error ? (
        <ErrorBlock message={query.error} onRetry={query.reload} />
      ) : query.loading || changingReport || changingAnalysis ? (
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
                        <Link
                          key={track.id}
                          className="track-card"
                          to={`/app/detections?analysis=${selected.id}&track=${track.id}`}
                          aria-label={`Review ${track.code}`}
                        >
                          <TrackPreview
                            key={`${track.snapshotFrameUrl}:${track.snapshotCropUrl}`}
                            track={track}
                          />
                          <div className="track-card__details">
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
                              {track.maskSource === "estimated" &&
                                " · Estimated mask"}
                            </small>
                          </div>
                        </Link>
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
                title={
                  report
                    ? `No analysis for report #${report.id}`
                    : "Select a report"
                }
                copy={
                  report
                    ? "Upload footage, enter a stream URL, or record a camera clip for this report."
                    : reports.length
                      ? "Choose a report above to view its analyses or start a new run."
                      : "Create a road report to start analysis."
                }
                action={
                  report && (
                    <button
                      className="button button--primary"
                      onClick={openUpload}
                    >
                      Upload footage
                    </button>
                  )
                }
              />
            )}
          </section>
          <aside className="analyzer-queue">
            <Panel
              title={unassigned ? "Unassigned runs" : "Analysis queue"}
              copy={
                report
                  ? `${queue.length} runs for report #${report.id}`
                  : `${queue.length} runs without a linked report`
              }
            >
              <div className="queue-list">
                {queue.map((analysis) => (
                  <div key={analysis.id} className="queue-item">
                    <button
                      className={`queue-item__select${selected?.id === analysis.id ? " is-active" : ""}`}
                      onClick={() =>
                        setParams({ ...reportParams, analysis: analysis.id })
                      }
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
                    <button
                      className="button button--danger queue-item__remove"
                      onClick={() => removeAnalysis(analysis)}
                      disabled={action.pending || analysis.status === "running"}
                      aria-label={`Remove ${analysis.name}`}
                      title={
                        analysis.status === "running"
                          ? "Stop or cancel this analysis before removing it."
                          : `Remove ${analysis.name}`
                      }
                    >
                      Remove
                    </button>
                  </div>
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
        open={creatingReport}
        onClose={() => setCreatingReport(false)}
        title="New road report"
        copy="Add the incident location and source, then attach video footage or a camera capture."
        pending={action.pending}
        notice={action.notice}
        fields={action.fields}
      >
        <form className="form modal-form" onSubmit={createReport}>
          <div className="form-grid">
            <label>
              City
              <input name="city" maxLength="120" required />
            </label>
            <label>
              Source device ID
              <input name="device_id" maxLength="80" required />
            </label>
            <label>
              Latitude
              <input
                type="number"
                name="lat"
                min="-90"
                max="90"
                step="any"
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
                required
              />
            </label>
            <label>
              Reported severity
              <select name="severity" defaultValue="low">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="span-2">
              Notes
              <textarea name="notes" maxLength="2000" rows="3" />
            </label>
          </div>
          <footer>
            <button
              type="button"
              className="button button--secondary"
              disabled={action.pending}
              onClick={() => setCreatingReport(false)}
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={action.pending}
            >
              {action.pending ? "Creating…" : "Create report"}
            </button>
          </footer>
        </form>
      </Modal>
      <Modal
        pending={action.pending}
        notice={action.notice}
        fields={action.fields}
        open={uploading}
        onClose={closeUpload}
        title="Upload and analyze"
        copy={
          report
            ? `Add footage to report #${report.id}${report.city ? ` — ${report.city}` : ""}.`
            : "Select a report before adding footage."
        }
        wide
      >
        <form className="form modal-form" onSubmit={upload}>
          <label>
            Footage source
            <select
              name="source_type"
              value={sourceType}
              disabled={action.pending}
              onChange={(event) => {
                setSourceType(event.target.value);
                setCapturedFile(null);
              }}
            >
              <option value="upload">Upload video file</option>
              <option value="live-stream">
                Stream URL (RTSP / HTTP / HTTPS)
              </option>
              <option value="dashcam">Dashcam</option>
              <option value="laptop">Laptop camera</option>
              <option value="mobile">Mobile camera</option>
            </select>
          </label>
          {sourceType === "dashcam" && (
            <label>
              Dashcam input
              <select
                value={dashcamInput}
                disabled={action.pending}
                onChange={(event) => {
                  setDashcamInput(event.target.value);
                  setCapturedFile(null);
                }}
              >
                <option value="file">Upload dashcam clip</option>
                <option value="stream">Stream URL</option>
                <option value="camera">Connected USB camera</option>
              </select>
            </label>
          )}
          {useCamera ? (
            <CameraCapture
              key={`${sourceType}-${dashcamInput}`}
              kind={sourceType}
              onChange={setCapturedFile}
              disabled={action.pending}
            />
          ) : !useStream ? (
            <div className="upload-drop">
              <Icon name="upload" size={28} />
              <strong>
                {sourceType === "dashcam"
                  ? "Select dashcam footage"
                  : "Select road survey footage"}
              </strong>
              <p>MP4, MOV, AVI, MKV, or WebM</p>
              <input
                type="file"
                name="video"
                accept=".mp4,.mov,.avi,.mkv,.webm"
                required
              />
            </div>
          ) : (
            <label>
              Stream URL
              <input
                name="stream_url"
                maxLength="500"
                pattern="(rtsp|http|https)://.+"
                placeholder="rtsp://camera-host/feed"
                required
              />
              <small>
                Use a stream reachable from the analysis server. Private cameras
                require the trusted-network setting.
              </small>
            </label>
          )}
          <div className="form-grid">
            <label>
              Road section
              <input
                name="road_section"
                placeholder="Commonwealth Avenue"
                maxLength="180"
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
              onClick={closeUpload}
              disabled={action.pending}
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={action.pending || (useCamera && !capturedFile)}
            >
              {action.pending ? "Starting…" : "Start analysis"}
            </button>
          </footer>
        </form>
      </Modal>
    </div>
  );
}
