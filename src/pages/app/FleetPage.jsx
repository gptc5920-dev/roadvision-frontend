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
import { useSession } from "../../app/SessionContext";
import { useAction, useApi } from "../../hooks/useApi";
import { endpoints, submitAction } from "../../services/api";
import { formatDate, formatNumber } from "../../utils/format";

export function FleetPage() {
  const session = useSession();
  const query = useApi(endpoints.fleet);
  const action = useAction(query.reload);
  const [registering, setRegistering] = useState(false);
  const devices = query.data?.devices || [];
  const online = devices.filter((device) => device.status === "online").length;
  async function submit(body) {
    await action.run(() => submitAction("fleet-cams", body));
  }
  async function register(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "save_fleet_device");
    const result = await action.run(() => submitAction("fleet-cams", body));
    if (result?.ok) setRegistering(false);
  }
  async function toggle(device) {
    const body = new FormData();
    body.set("action", "toggle_device_status");
    body.set("device_id", device.id);
    await submit(body);
  }
  async function analyze(device) {
    const body = new FormData();
    body.set("action", "analyze_fleet_stream");
    body.set("device_id", device.id);
    body.set("confidence_threshold", "35");
    await submit(body);
  }
  async function stop(device) {
    const body = new FormData();
    body.set("action", "stop_fleet_stream");
    body.set("device_id", device.id);
    body.set("analysis_id", device.activeAnalysis.id);
    await submit(body);
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Connected survey network"
        title="Fleet cameras"
        copy="Register vehicle cameras, monitor feed health, and launch continuous road-damage analysis."
        actions={
          session.user?.isAdmin && (
            <button
              className="button button--primary"
              onClick={() => setRegistering(true)}
            >
              Register camera
            </button>
          )
        }
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
              label="Registered cameras"
              value={devices.length}
              icon="camera"
            />
            <MetricCard
              label="Online now"
              value={online}
              detail={`${devices.length - online} offline`}
              tone="green"
              icon="activity"
            />
            <MetricCard
              label="Average throughput"
              value={`${formatNumber(devices.reduce((sum, device) => sum + device.fps, 0) / Math.max(devices.length, 1), { maximumFractionDigits: 1 })} fps`}
              tone="blue"
              icon="video"
            />
          </section>
          <div className="device-grid">
            {devices.length ? (
              devices.map((device) => (
                <Panel key={device.id} className="device-card">
                  <div className="device-card__heading">
                    <span className="device-card__icon">
                      <IconCamera />
                    </span>
                    <div>
                      <h3>{device.name}</h3>
                      <p>
                        {device.id} · {device.city}
                      </p>
                    </div>
                    <StatusBadge value={device.status} />
                  </div>
                  <dl>
                    <div>
                      <dt>Road section</dt>
                      <dd>{device.roadSection || "Not assigned"}</dd>
                    </div>
                    <div>
                      <dt>Chainage</dt>
                      <dd>{device.chainageStation || "—"}</dd>
                    </div>
                    <div>
                      <dt>Capture rate</dt>
                      <dd>{device.fps} FPS</dd>
                    </div>
                    <div>
                      <dt>Last seen</dt>
                      <dd>{formatDate(device.lastSeenAt)}</dd>
                    </div>
                  </dl>
                  {device.activeAnalysis ? (
                    <div className="live-analysis">
                      <span>
                        <i />
                        Continuous detection active
                      </span>
                      <small>
                        {device.activeAnalysis.progress}% ·{" "}
                        {device.activeAnalysis.uniquePotholes} defects
                      </small>
                    </div>
                  ) : (
                    <p className="device-card__source">
                      {device.hasStream
                        ? "Stream source configured"
                        : "No stream URL configured"}
                    </p>
                  )}
                  <div className="device-card__actions">
                    <button
                      className="button button--secondary"
                      onClick={() => toggle(device)}
                      disabled={action.pending}
                    >
                      {device.status === "online"
                        ? "Take offline"
                        : "Bring online"}
                    </button>
                    {device.activeAnalysis ? (
                      <button
                        className="button button--danger"
                        onClick={() => stop(device)}
                        disabled={action.pending}
                      >
                        Stop detection
                      </button>
                    ) : (
                      <button
                        className="button button--primary"
                        onClick={() => analyze(device)}
                        disabled={
                          action.pending ||
                          device.status !== "online" ||
                          !device.hasStream
                        }
                      >
                        Start detection
                      </button>
                    )}
                  </div>
                </Panel>
              ))
            ) : (
              <EmptyState
                icon="camera"
                title="No fleet cameras registered"
                copy="Register the first survey vehicle camera to begin live monitoring."
              />
            )}
          </div>
        </>
      )}
      <Modal
        pending={action.pending}
        notice={action.notice}
        fields={action.fields}
        open={registering}
        onClose={() => setRegistering(false)}
        title="Register fleet camera"
        copy="Use a stable device ID and a trusted stream endpoint."
      >
        <form className="form modal-form" onSubmit={register}>
          <div className="form-grid">
            <label>
              Device ID
              <input
                name="device_id"
                placeholder="CAM-CAV-01"
                maxLength="80"
                pattern="[A-Za-z0-9_-]+"
                title="Use letters, numbers, hyphens, or underscores."
                required
              />
            </label>
            <label>
              Camera name
              <input
                name="name"
                placeholder="Cavite survey unit"
                maxLength="160"
                required
              />
            </label>
            <label>
              City
              <input name="city" maxLength="120" required />
            </label>
            <label>
              Status
              <select name="status" defaultValue="online">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label className="span-2">
              Stream URL
              <input
                name="stream_url"
                placeholder="rtsp://camera-host/feed"
                maxLength="500"
                pattern="(rtsp|http|https)://.+"
                title="Use an RTSP, HTTP, or HTTPS stream URL without embedded credentials."
              />
            </label>
            <label>
              Road section
              <input name="road_section" maxLength="180" />
            </label>
            <label>
              Chainage station
              <input name="chainage_station" maxLength="80" />
            </label>
            <label>
              FPS
              <input
                type="number"
                name="fps"
                min="0"
                max="999.99"
                step="0.01"
                defaultValue="30"
                required
              />
            </label>
            <label>
              Model version
              <input
                name="model_version"
                maxLength="80"
                defaultValue="fleet-camera"
              />
            </label>
          </div>
          <footer>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setRegistering(false)}
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={action.pending}
            >
              Save camera
            </button>
          </footer>
        </form>
      </Modal>
    </div>
  );
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
