import { useMemo, useState } from "react";
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
              <form className="form upload-form" onSubmit={upload}>
                <div className="upload-drop">
                  <Icon name="upload" size={30} />
                  <strong>Choose one or more road images</strong>
                  <p>JPG, PNG, or WebP · maximum 10 MB each</p>
                  <input
                    type="file"
                    name="images"
                    accept="image/*"
                    multiple
                    required
                  />
                </div>
                <div className="form-grid">
                  <label>
                    Source group
                    <input
                      name="source_group"
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
                    />
                  </label>
                </div>
                <button
                  className="button button--primary"
                  disabled={action.pending}
                >
                  {action.pending ? "Uploading…" : "Upload to dataset"}
                </button>
              </form>
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
                  copy="Annotated images will appear here."
                />
              )}
            </Panel>
          )}
          {tab === "training" && (
            <Panel
              title="Start model training"
              copy="The dataset is frozen into a reproducible manifest when the session is queued."
            >
              <form className="form training-form" onSubmit={startTraining}>
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
                    <input
                      type="number"
                      name="epochs"
                      defaultValue="100"
                      min="1"
                      max="1000"
                    />
                  </label>
                  <label>
                    Batch size
                    <input
                      type="number"
                      name="batch_size"
                      defaultValue="8"
                      min="1"
                      max="256"
                    />
                  </label>
                  <label>
                    Image size
                    <input
                      type="number"
                      name="image_size"
                      defaultValue="512"
                      min="128"
                      max="2048"
                    />
                  </label>
                  <label>
                    Learning rate
                    <input
                      type="number"
                      name="learning_rate"
                      defaultValue="0.001"
                      step="0.000001"
                      min="0.000001"
                      required
                    />
                  </label>
                  <label>
                    Device
                    <input name="device" defaultValue="cpu" maxLength="60" />
                  </label>
                  <label>
                    Patience
                    <input
                      type="number"
                      name="patience"
                      defaultValue="30"
                      min="0"
                      max="300"
                    />
                  </label>
                  <label>
                    Workers
                    <input
                      type="number"
                      name="workers"
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
                    <input
                      type="number"
                      name="seed"
                      defaultValue="42"
                      min="0"
                      max="2147483647"
                    />
                  </label>
                  <label>
                    Freeze layers
                    <input
                      type="number"
                      name="freeze_layers"
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
              </form>
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
                  copy="Queue a session once the dataset readiness gate passes."
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
                <form className="form" onSubmit={testDetection}>
                  <label>
                    Test image
                    <input
                      type="file"
                      name="test_image"
                      accept="image/*"
                      required
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Confidence threshold
                      <input
                        type="number"
                        name="confidence_threshold"
                        defaultValue="50"
                        min="1"
                        max="99"
                      />
                    </label>
                    <label>
                      IoU threshold
                      <input
                        type="number"
                        name="iou_threshold"
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
                </form>
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
