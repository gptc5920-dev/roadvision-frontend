import { useMemo, useState } from "react";
import { ValidatedForm, PresetNumber } from "../../components/ui/ValidatedForm";
import { MaskEditor, MaskOverlay } from "../../components/ui/MaskEditor";
import { useSearchParams } from "react-router-dom";
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
import { useAction, useApi } from "../../hooks/useApi";
import { endpoints, submitAction } from "../../services/api";
import { formatDate, formatNumber, formatPercent } from "../../utils/format";

const tabs = [
  "overview",
  "upload",
  "annotate",
  "review",
  "training",
  "history",
  "test",
];

export function DatasetPage() {
  const [params, setParams] = useSearchParams();
  const tab = tabs.includes(params.get("tab")) ? params.get("tab") : "overview";
  const query = useApi(endpoints.dataset, {
    interval: 5000,
    pollWhen: (data) =>
      data?.sessions?.some((session) =>
        ["queued", "running"].includes(session.status),
      ),
  });
  const action = useAction(query.reload);
  const [selectedId, setSelectedId] = useState(null);
  const images = query.data?.images || [];
  const selected = useMemo(
    () => images.find((image) => image.id === selectedId) || images[0],
    [images, selectedId],
  );
  function choose(image) {
    setSelectedId(image.id);
  }
  async function run(body) {
    return action.run(() => submitAction("dataset", body));
  }
  async function upload(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "upload_images");
    await run(body);
  }
  async function saveMasks(masks) {
    const body = new FormData();
    body.set("action", "save_annotations");
    body.set("image_id", selected.id);
    body.set(
      "annotations_json",
      JSON.stringify(masks.map((points) => ({ segmentation_points: points }))),
    );
    return run(body);
  }
  async function review(image, status) {
    const body = new FormData();
    body.set("action", "review_image");
    body.set("image_id", image.id);
    body.set("status", status);
    body.set("review_notes", "Reviewed in React console");
    await run(body);
  }
  async function startTraining(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "start_training");
    if (await run(body)) setParams({ tab: "history" });
  }
  async function retryTraining(session) {
    const body = new FormData();
    body.set("action", "retry_training");
    body.set("session_id", session.id);
    await run(body);
  }
  async function testDetection(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "test_detection");
    await run(body);
  }

  return (
    <div className="page page--wide">
      <PageHeader
        eyebrow="Model improvement"
        title="Training dataset"
        copy="Upload road imagery, refine segmentation masks, approve ground truth, and monitor model training."
      />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {query.error ? (
        <ErrorBlock message={query.error} onRetry={query.reload} />
      ) : query.loading ? (
        <LoadingBlock />
      ) : (
        <>
          <nav className="tabs" aria-label="Dataset sections">
            {tabs.map((item) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => setParams({ tab: item })}
              >
                {item}
              </button>
            ))}
          </nav>
          {tab === "overview" && (
            <>
              <section className="metric-grid">
                <MetricCard
                  label="Dataset images"
                  value={formatNumber(query.data.summary.total_images)}
                  icon="dataset"
                />
                <MetricCard
                  label="Annotated"
                  value={formatNumber(query.data.summary.annotated_images)}
                  tone="blue"
                  icon="activity"
                />
                <MetricCard
                  label="Approved"
                  value={formatNumber(query.data.summary.approved_images)}
                  tone="green"
                  icon="check"
                />
                <MetricCard
                  label="Pothole masks"
                  value={formatNumber(query.data.summary.total_potholes)}
                  tone="orange"
                  icon="alert"
                />
              </section>
              <div className="dashboard-grid">
                <Panel title="Dataset readiness">
                  <div
                    className={`readiness-card ${query.data.readiness.ready ? "is-ready" : ""}`}
                  >
                    <Icon
                      name={query.data.readiness.ready ? "check" : "alert"}
                      size={28}
                    />
                    <div>
                      <strong>
                        {query.data.readiness.ready
                          ? "Ready for training"
                          : "More reviewed data required"}
                      </strong>
                      <p>
                        {query.data.readiness.errors.join(" ") ||
                          "Every split meets the configured minimum."}
                      </p>
                    </div>
                  </div>
                </Panel>
                <Panel title="Latest version">
                  <dl className="key-values">
                    {query.data.versions[0] ? (
                      <>
                        <div>
                          <dt>Version</dt>
                          <dd>v{query.data.versions[0].version}</dd>
                        </div>
                        <div>
                          <dt>Images</dt>
                          <dd>{query.data.versions[0].images}</dd>
                        </div>
                        <div>
                          <dt>Annotations</dt>
                          <dd>{query.data.versions[0].annotations}</dd>
                        </div>
                        <div>
                          <dt>Split</dt>
                          <dd>{query.data.versions[0].split.join(" / ")}</dd>
                        </div>
                      </>
                    ) : (
                      <div>
                        <dt>Status</dt>
                        <dd>No version yet</dd>
                      </div>
                    )}
                  </dl>
                </Panel>
              </div>
              <Panel title="Dataset distribution">
                <div className="dataset-gallery dataset-gallery--compact">
                  {images.slice(0, 12).map((image) => (
                    <button
                      key={image.id}
                      onClick={() => {
                        choose(image);
                        setParams({ tab: "annotate" });
                      }}
                    >
                      <img
                        src={image.previewUrl || image.url}
                        alt={image.filename}
                      />
                      <span>
                        <strong>{image.datasetId}</strong>
                        <StatusBadge value={image.status} />
                      </span>
                    </button>
                  ))}
                </div>
                {!images.length && (
                  <EmptyState
                    icon="dataset"
                    title="Dataset is empty"
                    copy="Upload road images to begin building the training set."
                    to="/app/dataset?tab=upload"
                    actionLabel="Upload images"
                  />
                )}
              </Panel>
            </>
          )}
          {tab === "upload" && (
            <Panel
              title="Upload road imagery"
              copy="Images in the same survey or route group stay in one data split to prevent leakage."
            >
              <ValidatedForm
                className="form upload-form"
                fields={action.fields}
                onSubmit={upload}
                validate={(body) =>
                  Number(body.get("train_percent")) +
                    Number(body.get("val_percent")) +
                    Number(body.get("test_percent")) ===
                  100
                    ? {}
                    : {
                        __all__: [
                          "Training, validation, and testing split percentages must total 100%.",
                        ],
                      }
                }
              >
                <div className="upload-drop">
                  <Icon name="upload" size={30} />
                  <strong>Choose one or more road images</strong>
                  <p>JPG, PNG, or WebP · maximum 10 MB each</p>
                  <input
                    type="file"
                    name="images"
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    required
                  />
                </div>
                <div className="form-grid">
                  <label>
                    Source group
                    <datalist id="dataset-source-groups">
                      {[
                        ...new Set(
                          images
                            .map((image) => image.sourceGroup)
                            .filter(Boolean),
                        ),
                      ].map((group) => (
                        <option key={group} value={group} />
                      ))}
                    </datalist>
                    <input
                      name="source_group"
                      list="dataset-source-groups"
                      placeholder="route-17-survey-a"
                      maxLength="120"
                      pattern="[A-Za-z0-9_-]+"
                      title="Use letters, numbers, hyphens, or underscores."
                      required
                    />
                  </label>
                  <label>
                    Notes
                    <input
                      name="notes"
                      maxLength="220"
                      placeholder="Northbound morning survey"
                    />
                  </label>
                  <label>
                    Train %
                    <input
                      type="number"
                      name="train_percent"
                      defaultValue="70"
                      min="1"
                      max="98"
                      required
                    />
                  </label>
                  <label>
                    Validation %
                    <input
                      type="number"
                      name="val_percent"
                      defaultValue="20"
                      min="1"
                      max="98"
                      required
                    />
                  </label>
                  <label>
                    Test %
                    <input
                      type="number"
                      name="test_percent"
                      defaultValue="10"
                      min="1"
                      max="98"
                      required
                    />
                  </label>
                </div>
                <button
                  className="button button--primary"
                  disabled={action.pending}
                >
                  {action.pending ? "Uploading…" : "Upload to dataset"}
                </button>
              </ValidatedForm>
            </Panel>
          )}
          {tab === "annotate" && (
            <div className="annotation-layout">
              <Panel title="Image queue" className="annotation-queue">
                <div className="annotation-thumbs">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      className={selected?.id === image.id ? "active" : ""}
                      onClick={() => choose(image)}
                    >
                      <img src={image.url} alt="" />
                      <div>
                        <strong>{image.datasetId}</strong>
                        <small>
                          {image.potholeCount} masks · {image.split}
                        </small>
                      </div>
                      <StatusBadge value={image.status} />
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel
                title={
                  selected ? `Draw mask · ${selected.datasetId}` : "Draw mask"
                }
                copy="Click around the visible pothole boundary. Use at least three points."
              >
                {selected ? (
                  <MaskEditor
                    key={selected.id}
                    image={selected}
                    onSave={saveMasks}
                    pending={action.pending}
                  />
                ) : (
                  <EmptyState
                    icon="dataset"
                    title="No image selected"
                    copy="Upload an image before drawing masks."
                    to="/app/dataset?tab=upload"
                    actionLabel="Upload images"
                  />
                )}
              </Panel>
            </div>
          )}
          {tab === "review" && (
            <Panel
              title="Ground-truth review"
              copy="Approve only masks that accurately follow the visible pothole boundary."
            >
              <div className="review-grid">
                {images.map((image) => (
                  <article key={image.id}>
                    <div className="mask-editor mask-editor--review">
                      <img src={image.url} alt={image.filename} />
                      <MaskOverlay
                        masks={image.annotations.map(
                          (annotation) => annotation.points || [],
                        )}
                      />
                    </div>
                    <div>
                      <span>
                        <strong>{image.datasetId}</strong>
                        <StatusBadge value={image.status} />
                      </span>
                      <p>
                        {image.sourceGroup || "Independent upload"} ·{" "}
                        {image.split}
                      </p>
                      <small>{image.potholeCount} masks</small>
                      <footer>
                        <button
                          className="button button--secondary"
                          disabled={action.pending}
                          onClick={() => review(image, "rejected")}
                        >
                          Reject
                        </button>
                        <button
                          className="button button--primary"
                          disabled={action.pending}
                          onClick={() => review(image, "approved")}
                        >
                          Approve
                        </button>
                      </footer>
                    </div>
                  </article>
                ))}
              </div>
              {!images.length && (
                <EmptyState
                  icon="check"
                  title="Nothing to review"
                  copy="Draw and save pothole masks on uploaded images, then return here to review them."
                  to="/app/dataset?tab=annotate"
                  actionLabel="Annotate images"
                />
              )}
            </Panel>
          )}
          {tab === "training" && (
            <Panel
              title="Start model training"
              copy="The dataset is frozen into a reproducible manifest when the session is queued."
            >
              {!query.data.readiness.ready && (
                <div className="notice notice--error" role="status">
                  <div>
                    <strong>Prepare the dataset before training</strong>
                    <ul>
                      {query.data.readiness.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <ValidatedForm
                className="form training-form"
                fields={action.fields}
                onSubmit={startTraining}
              >
                <div className="form-grid form-grid--three">
                  <label>
                    Architecture
                    <select name="model_name" defaultValue="yolo11s-seg">
                      <option value="yolo11n-seg">YOLO11n segmentation</option>
                      <option value="yolo11s-seg">YOLO11s segmentation</option>
                      <option value="yolo26n-seg">YOLO26n segmentation</option>
                      <option value="yolo26s-seg">YOLO26s segmentation</option>
                    </select>
                  </label>
                  <label>
                    Epochs
                    <PresetNumber
                      name="epochs"
                      options={[10, 25, 50, 100, 200]}
                      defaultValue="100"
                      min="1"
                      max="1000"
                    />
                  </label>
                  <label>
                    Batch size
                    <PresetNumber
                      name="batch_size"
                      options={[1, 2, 4, 8, 16, 32, 64]}
                      defaultValue="8"
                      min="1"
                      max="256"
                    />
                  </label>
                  <label>
                    Image size
                    <PresetNumber
                      name="image_size"
                      options={[
                        128, 256, 320, 512, 640, 768, 1024, 1280, 1536, 2048,
                      ]}
                      defaultValue="512"
                      min="128"
                      max="2048"
                    />
                  </label>
                  <label>
                    Learning rate
                    <PresetNumber
                      name="learning_rate"
                      options={[0.0001, 0.001, 0.01]}
                      defaultValue="0.001"
                      step="0.000001"
                      min="0.000001"
                      required
                      max="1"
                    />
                  </label>
                  <label>
                    Device
                    <select name="device" defaultValue="auto">
                      <option value="auto">Auto</option>
                      <option value="cpu">CPU</option>
                      <option value="0">CUDA GPU 0</option>
                    </select>
                  </label>
                  <label>
                    Patience
                    <PresetNumber
                      name="patience"
                      options={[0, 10, 20, 30, 50, 100]}
                      defaultValue="30"
                      min="0"
                      max="300"
                    />
                  </label>
                  <label>
                    Workers
                    <PresetNumber
                      name="workers"
                      options={[0, 2, 4, 8]}
                      defaultValue="2"
                      min="0"
                      max="32"
                    />
                  </label>
                  <label>
                    Optimizer
                    <select name="optimizer" defaultValue="AdamW">
                      <option>AdamW</option>
                      <option value="auto">Ultralytics auto</option>
                      <option>SGD</option>
                    </select>
                  </label>
                  <label>
                    Augmentation
                    <select name="augmentation_profile" defaultValue="balanced">
                      <option value="conservative">Conservative</option>
                      <option value="balanced">Balanced</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </label>
                  <label>
                    Seed
                    <PresetNumber
                      name="seed"
                      options={[42, 123, 2026]}
                      defaultValue="42"
                      min="0"
                      max="2147483647"
                    />
                  </label>
                  <label>
                    Freeze layers
                    <PresetNumber
                      name="freeze_layers"
                      options={[0, 10, 20]}
                      defaultValue="0"
                      min="0"
                      max="24"
                    />
                  </label>
                </div>
                <button
                  className="button button--primary"
                  disabled={!query.data.readiness.ready || action.pending}
                >
                  Queue training session
                </button>
              </ValidatedForm>
            </Panel>
          )}
          {tab === "history" && (
            <Panel title="Training history">
              <div className="session-list">
                {query.data.sessions.map((session) => (
                  <article key={session.id}>
                    <div>
                      <strong>{session.model}</strong>
                      <p>
                        Session #{session.id} · {formatDate(session.createdAt)}
                      </p>
                    </div>
                    <StatusBadge value={session.status} />
                    {session.active && (
                      <StatusBadge value="active" label="Active model" />
                    )}
                    {session.status === "failed" && !session.active && (
                      <button
                        className="button button--secondary"
                        disabled={action.pending}
                        onClick={() => retryTraining(session)}
                      >
                        <Icon name="refresh" size={16} /> Retry training
                      </button>
                    )}
                    {session.error && (
                      <p className="training-message" role="alert">
                        {session.error}
                      </p>
                    )}
                    {session.validationNotes && (
                      <p className="training-message">
                        {session.validationNotes}
                      </p>
                    )}
                    <div>
                      <span>
                        {session.task === "detect" ? "Box mAP50" : "Mask mAP50"}
                      </span>
                      <strong>
                        {session.map50 === null
                          ? "—"
                          : formatPercent(session.map50 * 100, 1)}
                      </strong>
                    </div>
                    <div>
                      <span>Precision / recall</span>
                      <strong>
                        {session.precision === null
                          ? "—"
                          : `${formatPercent(session.precision * 100, 0)} / ${formatPercent(session.recall * 100, 0)}`}
                      </strong>
                    </div>
                    {["queued", "running"].includes(session.status) && (
                      <ProgressBar
                        value={session.progress}
                        label={`Epoch ${session.epoch} / ${session.epochs}`}
                      />
                    )}
                  </article>
                ))}
              </div>
              {!query.data.sessions.length && (
                <EmptyState
                  icon="activity"
                  title="No training sessions"
                  copy="Check dataset readiness and configure your first training session."
                  to="/app/dataset?tab=training"
                  actionLabel="Prepare training"
                />
              )}
            </Panel>
          )}
          {tab === "test" && (
            <div className="dashboard-grid">
              <Panel
                title="Test active detector"
                copy="Run the active model on a single road image."
              >
                <ValidatedForm
                  className="form"
                  fields={action.fields}
                  onSubmit={testDetection}
                >
                  <label>
                    Test image
                    <input
                      type="file"
                      name="test_image"
                      accept=".jpg,.jpeg,.png,.webp"
                      required
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Confidence threshold
                      <PresetNumber
                        name="confidence_threshold"
                        options={[25, 30, 35, 50, 70, 85, 95]}
                        defaultValue="50"
                        min="1"
                        max="99"
                      />
                    </label>
                    <label>
                      IoU threshold
                      <PresetNumber
                        name="iou_threshold"
                        options={[30, 45, 50, 60, 70]}
                        defaultValue="45"
                        min="1"
                        max="99"
                      />
                    </label>
                  </div>
                  <button
                    className="button button--primary"
                    disabled={action.pending}
                  >
                    Run detection test
                  </button>
                </ValidatedForm>
              </Panel>
              <Panel title="Recent tests">
                <div className="test-list">
                  {query.data.tests.map((test) => (
                    <article key={test.id}>
                      {(test.resultUrl || test.imageUrl) && (
                        <img
                          src={test.resultUrl || test.imageUrl}
                          alt="Detection result"
                        />
                      )}
                      <div>
                        <strong>{test.filename}</strong>
                        <p>
                          {test.detections} detections · {test.processingMs} ms
                        </p>
                      </div>
                      <StatusBadge value={test.status} />
                    </article>
                  ))}
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
