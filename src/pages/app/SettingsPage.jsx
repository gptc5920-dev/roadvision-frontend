import { ValidatedForm, PresetNumber } from "../../components/ui/ValidatedForm";
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
  const profileAction = useAction(async () => {
    await query.reload();
    await session.refresh();
  });
  const action = useAction(query.reload);
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
    await profileAction.run(() => submitAction("settings", body));
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
            <ValidatedForm
              className="form settings-form"
              fields={action.fields}
              onSubmit={settings}
            >
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
                  <PresetNumber
                    name="confidence_threshold"
                    options={[25, 30, 35, 50, 70, 85, 95]}
                    defaultValue={query.data.configuration.confidenceThreshold}
                    min="1"
                    max="99"
                    disabled={!isAdmin}
                    required
                  />
                </label>
                <label>
                  IoU threshold
                  <PresetNumber
                    name="iou_threshold"
                    options={[30, 45, 50, 60, 70]}
                    defaultValue={query.data.configuration.iouThreshold}
                    min="1"
                    max="99"
                    disabled={!isAdmin}
                    required
                  />
                </label>
                <label>
                  Input resolution
                  <PresetNumber
                    name="input_resolution"
                    options={[320, 512, 640, 768, 1024, 1280, 1536, 2048]}
                    defaultValue={query.data.configuration.inputResolution}
                    min="160"
                    max="2048"
                    disabled={!isAdmin}
                    required
                  />
                </label>
                <label>
                  Frame skip
                  <PresetNumber
                    name="frame_skip"
                    options={[1, 2, 3, 5, 10, 30]}
                    defaultValue={query.data.configuration.frameSkip}
                    min="1"
                    max="120"
                    disabled={!isAdmin}
                    required
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
                  <PresetNumber
                    name="max_detections"
                    options={[10, 25, 50, 100, 200, 500]}
                    defaultValue={query.data.configuration.maxDetections}
                    min="1"
                    max="500"
                    disabled={!isAdmin}
                    required
                  />
                </label>
                <label>
                  Max attempts
                  <PresetNumber
                    name="max_attempts"
                    options={[1, 2, 3, 5, 10]}
                    defaultValue={query.data.configuration.maxAttempts}
                    min="1"
                    max="10"
                    disabled={!isAdmin}
                    required
                  />
                </label>
                <label>
                  Min track appearances
                  <PresetNumber
                    name="min_track_appearances"
                    options={[1, 2, 3, 5, 10]}
                    defaultValue={query.data.configuration.minTrackAppearances}
                    min="1"
                    max="30"
                    disabled={!isAdmin}
                    required
                  />
                </label>
                <label>
                  Dedup IoU
                  <PresetNumber
                    name="dedup_iou_threshold"
                    options={[0.15, 0.25, 0.35, 0.5, 0.75]}
                    defaultValue={query.data.configuration.dedupIouThreshold}
                    min="0.05"
                    max="0.95"
                    step="0.001"
                    disabled={!isAdmin}
                    required
                  />
                </label>
                <label>
                  Dedup max gap
                  <PresetNumber
                    name="dedup_max_gap_frames"
                    options={[30, 60, 90, 150, 300]}
                    defaultValue={query.data.configuration.dedupMaxGapFrames}
                    min="1"
                    max="1000"
                    disabled={!isAdmin}
                    required
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
            </ValidatedForm>
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
              <Notice
                notice={profileAction.notice}
                onClose={() => profileAction.setNotice(null)}
              />
              <ValidatedForm
                className="form"
                fields={profileAction.fields}
                onSubmit={profile}
              >
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
                  disabled={profileAction.pending}
                >
                  Update profile
                </button>
              </ValidatedForm>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}
