import { PageHeader, Panel, StatusBadge } from "../../components/ui/Page";
import { ErrorBlock, LoadingBlock, Notice } from "../../components/ui/Feedback";
import { useSession } from "../../app/SessionContext";
import { useAction, useApi } from "../../hooks/useApi";
import { endpoints, submitAction } from "../../services/api";

const Check = ({ name, label, defaultChecked, disabled }) => (
  <label className="check-field">
    <input
      type="checkbox"
      name={name}
      defaultChecked={defaultChecked}
      disabled={disabled}
    />
    <span>
      <i />
      {label}
    </span>
  </label>
);

export function SettingsPage() {
  const session = useSession();
  const query = useApi(endpoints.settings);
  const action = useAction(async () => {
    await query.reload();
    await session.refresh();
  });
  const isAdmin = session.user?.isAdmin;
  async function settings(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "update_analyzer_settings");
    await action.run(() => submitAction("settings", body));
  }
  async function profile(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "update_profile");
    await action.run(() => submitAction("settings", body));
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="System configuration"
        title="Settings"
        copy="Control active models, analyzer defaults, and your console profile."
      />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {query.error ? (
        <ErrorBlock message={query.error} onRetry={query.reload} />
      ) : query.loading ? (
        <LoadingBlock />
      ) : (
        <div className="settings-layout">
          <Panel
            title="Model and analysis settings"
            copy={
              isAdmin
                ? "Changes apply to newly queued analyses."
                : "Administrator access is required to change these values."
            }
          >
            <form className="form settings-form" onSubmit={settings}>
              <div className="form-grid form-grid--three">
                <label>
                  Active model
                  <select
                    name="model_session"
                    defaultValue={query.data.configuration.modelSession || ""}
                    disabled={!isAdmin}
                    required
                  >
                    <option value="" disabled>
                      Select validated model
                    </option>
                    {query.data.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} · mAP50 {model.map50}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Default training architecture
                  <select
                    name="training_model"
                    defaultValue={query.data.configuration.trainingModel}
                    disabled={!isAdmin}
                  >
                    <option value="yolo11n-seg">YOLO11n segmentation</option>
                    <option value="yolo11s-seg">YOLO11s segmentation</option>
                    <option value="yolo11m-seg">YOLO11m segmentation</option>
                    <option value="yolo11l-seg">YOLO11l segmentation</option>
                    <option value="yolo11x-seg">YOLO11x segmentation</option>
                    <option value="yolo26n-seg">YOLO26n segmentation</option>
                    <option value="yolo26s-seg">YOLO26s segmentation</option>
                    <option value="yolo26m-seg">YOLO26m segmentation</option>
                    <option value="yolo26l-seg">YOLO26l segmentation</option>
                    <option value="yolo26x-seg">YOLO26x segmentation</option>
                  </select>
                </label>
                <label>
                  Mode
                  <select
                    name="mode"
                    defaultValue={query.data.configuration.mode}
                    disabled={!isAdmin}
                  >
                    <option value="accurate">Accurate</option>
                    <option value="real-time">Real time</option>
                  </select>
                </label>
                <label>
                  Confidence threshold
                  <input
                    type="number"
                    name="confidence_threshold"
                    defaultValue={query.data.configuration.confidenceThreshold}
                    min="1"
                    max="99"
                    disabled={!isAdmin}
                  />
                </label>
                <label>
                  IoU threshold
                  <input
                    type="number"
                    name="iou_threshold"
                    defaultValue={query.data.configuration.iouThreshold}
                    min="1"
                    max="99"
                    disabled={!isAdmin}
                  />
                </label>
                <label>
                  Input resolution
                  <input
                    type="number"
                    name="input_resolution"
                    defaultValue={query.data.configuration.inputResolution}
                    min="160"
                    max="2048"
                    disabled={!isAdmin}
                  />
                </label>
                <label>
                  Frame skip
                  <input
                    type="number"
                    name="frame_skip"
                    defaultValue={query.data.configuration.frameSkip}
                    min="1"
                    max="120"
                    disabled={!isAdmin}
                  />
                </label>
                <label>
                  Device
                  <select
                    name="device"
                    defaultValue={query.data.configuration.device}
                    disabled={!isAdmin}
                  >
                    <option value="cpu">CPU</option>
                    <option value="auto">Auto</option>
                    <option value="0">CUDA GPU 0</option>
                  </select>
                </label>
                <label>
                  Tracker
                  <select
                    name="tracker"
                    defaultValue={query.data.configuration.tracker}
                    disabled={!isAdmin}
                  >
                    <option value="bytetrack.yaml">ByteTrack</option>
                    <option value="botsort.yaml">BoT-SORT</option>
                    <option value="iou">Simple IoU fallback</option>
                  </select>
                </label>
                <label>
                  Max detections
                  <input
                    type="number"
                    name="max_detections"
                    defaultValue={query.data.configuration.maxDetections}
                    min="1"
                    max="500"
                    disabled={!isAdmin}
                  />
                </label>
                <label>
                  Max attempts
                  <input
                    type="number"
                    name="max_attempts"
                    defaultValue={query.data.configuration.maxAttempts}
                    min="1"
                    max="10"
                    disabled={!isAdmin}
                  />
                </label>
                <label>
                  Min track appearances
                  <input
                    type="number"
                    name="min_track_appearances"
                    defaultValue={query.data.configuration.minTrackAppearances}
                    min="1"
                    max="30"
                    disabled={!isAdmin}
                  />
                </label>
                <label>
                  Dedup IoU
                  <input
                    type="number"
                    name="dedup_iou_threshold"
                    defaultValue={query.data.configuration.dedupIouThreshold}
                    min="0.05"
                    max="0.95"
                    step="0.001"
                    disabled={!isAdmin}
                  />
                </label>
                <label>
                  Dedup max gap
                  <input
                    type="number"
                    name="dedup_max_gap_frames"
                    defaultValue={query.data.configuration.dedupMaxGapFrames}
                    min="1"
                    max="1000"
                    disabled={!isAdmin}
                  />
                </label>
              </div>
              <div className="check-grid">
                <Check
                  name="half_precision"
                  label="Half precision"
                  defaultChecked={query.data.configuration.halfPrecision}
                  disabled={!isAdmin}
                />
                <Check
                  name="include_road_damage"
                  label="Include road damage"
                  defaultChecked={query.data.configuration.includeRoadDamage}
                  disabled={!isAdmin}
                />
                <Check
                  name="show_labels"
                  label="Show labels"
                  defaultChecked={query.data.configuration.showLabels}
                  disabled={!isAdmin}
                />
                <Check
                  name="show_confidence"
                  label="Show confidence"
                  defaultChecked={query.data.configuration.showConfidence}
                  disabled={!isAdmin}
                />
                <Check
                  name="show_tracking_ids"
                  label="Show tracking IDs"
                  defaultChecked={query.data.configuration.showTrackingIds}
                  disabled={!isAdmin}
                />
                <Check
                  name="show_boxes"
                  label="Show boxes"
                  defaultChecked={query.data.configuration.showBoxes}
                  disabled={!isAdmin}
                />
                <Check
                  name="show_gps_overlay"
                  label="Show GPS overlay"
                  defaultChecked={query.data.configuration.showGpsOverlay}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin && (
                <button
                  className="button button--primary"
                  disabled={action.pending}
                >
                  Save analyzer settings
                </button>
              )}
            </form>
          </Panel>
          <aside className="settings-side">
            <Panel title="System readiness">
              <div className="readiness-row">
                <div>
                  <span>Model</span>
                  <strong>
                    {query.data.modelReadiness.ready ? "Ready" : "Blocked"}
                  </strong>
                </div>
                <StatusBadge
                  value={query.data.modelReadiness.ready ? "online" : "failed"}
                />
                <p>
                  {query.data.modelReadiness.errors.join(" ") ||
                    "Active model passed configured readiness gates."}
                </p>
              </div>
              <div className="readiness-row">
                <div>
                  <span>Training data</span>
                  <strong>
                    {query.data.datasetReadiness.ready ? "Ready" : "Building"}
                  </strong>
                </div>
                <StatusBadge
                  value={
                    query.data.datasetReadiness.ready ? "online" : "pending"
                  }
                />
                <p>
                  {query.data.datasetReadiness.errors.join(" ") ||
                    "All data splits meet the minimum."}
                </p>
              </div>
            </Panel>
            <Panel title="Console profile">
              <form className="form" onSubmit={profile}>
                <label>
                  Full name
                  <input
                    name="full_name"
                    maxLength="255"
                    defaultValue={query.data.profile.name}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    maxLength="254"
                    defaultValue={query.data.profile.email}
                    required
                  />
                </label>
                <button
                  className="button button--secondary"
                  disabled={action.pending}
                >
                  Update profile
                </button>
              </form>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}
