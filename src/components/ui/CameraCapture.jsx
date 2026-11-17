import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 45;

export function CameraCapture({ kind = "laptop", onChange, disabled = false }) {
  const preview = useRef(null);
  const stream = useRef(null);
  const recorder = useRef(null);
  const timer = useRef(null);
  const limit = useRef(null);
  const generation = useRef(0);
  const change = useRef(onChange);
  change.current = onChange;
  const [phase, setPhase] = useState("idle");
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [file, setFile] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [error, setError] = useState("");

  function clearTimers() {
    clearInterval(timer.current);
    clearTimeout(limit.current);
  }
  function releaseStream() {
    stream.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    stream.current = null;
  }
  useEffect(() => {
    return () => {
      generation.current += 1;
      clearTimers();
      if (recorder.current) {
        recorder.current.ondataavailable = null;
        recorder.current.onstop = null;
        recorder.current.onerror = null;
        if (recorder.current.state !== "inactive") recorder.current.stop();
      }
      releaseStream();
    };
  }, []);
  useEffect(() => {
    if (!file) {
      setRecordedUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setRecordedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (preview.current && phase === "ready")
      preview.current.srcObject = stream.current;
  }, [phase]);

  async function enableCamera(nextDevice = "") {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access requires HTTPS or localhost and a supported browser.",
      );
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError(
        "This browser cannot record camera clips. Upload a video or use a Stream URL instead.",
      );
      return;
    }
    const request = ++generation.current;
    releaseStream();
    setError("");
    setPhase("requesting");
    try {
      const opened = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(nextDevice
            ? { deviceId: { exact: nextDevice } }
            : {
                facingMode: {
                  ideal: kind === "mobile" ? "environment" : "user",
                },
              }),
        },
      });
      if (request !== generation.current) {
        opened.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = opened;
      const track = opened.getVideoTracks()[0];
      setDeviceId(track?.getSettings?.().deviceId || nextDevice);
      track.onended = () => {
        if (recorder.current?.state === "recording") recorder.current.stop();
        else {
          releaseStream();
          setPhase("idle");
          setError(
            "The camera disconnected. Reconnect it and enable the camera again.",
          );
        }
      };
      setPhase("ready");
      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const available = await navigator.mediaDevices.enumerateDevices();
          if (request === generation.current)
            setDevices(
              available.filter((device) => device.kind === "videoinput"),
            );
        } catch {
          // Recording remains available when camera enumeration is blocked.
        }
      }
    } catch (failure) {
      if (request !== generation.current) return;
      releaseStream();
      setPhase("idle");
      setError(
        failure.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser and try again."
          : failure.name === "NotFoundError"
            ? "No camera was found. Connect a camera or upload a video instead."
            : "The camera could not be opened. Close other apps using it and try again.",
      );
    }
  }

  function startRecording() {
    setError("");
    const chunks = [];
    const mimeType = ["video/webm;codecs=vp8", "video/webm", "video/mp4"].find(
      (type) => MediaRecorder.isTypeSupported?.(type),
    );
    try {
      const active = new MediaRecorder(stream.current, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_000_000,
      });
      recorder.current = active;
      active.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      active.onstop = () => {
        clearTimers();
        releaseStream();
        if (!chunks.length) {
          setPhase("idle");
          setError(
            "The camera did not produce a video. Enable the camera and try again.",
          );
          return;
        }
        const type =
          chunks[0].type || active.mimeType || mimeType || "video/webm";
        const extension = type.includes("mp4") ? "mp4" : "webm";
        const captured = new File(
          chunks,
          `${kind}-capture-${Date.now()}.${extension}`,
          { type },
        );
        setFile(captured);
        change.current(captured);
        setPhase("recorded");
      };
      active.onerror = () => {
        active.onstop = null;
        clearTimers();
        if (active.state !== "inactive") active.stop();
        releaseStream();
        setPhase("idle");
        setError("Recording failed. Enable the camera and try again.");
      };
      active.start(1000);
      setSeconds(0);
      setPhase("recording");
      timer.current = setInterval(
        () => setSeconds((value) => Math.min(value + 1, MAX_SECONDS)),
        1000,
      );
      limit.current = setTimeout(stopRecording, MAX_SECONDS * 1000);
    } catch {
      setError(
        "Recording is unavailable for this camera. Try another camera or upload a video.",
      );
    }
  }
  function stopRecording() {
    clearTimers();
    if (recorder.current?.state === "recording") {
      setPhase("stopping");
      recorder.current.stop();
    }
  }
  function retake() {
    setFile(null);
    change.current(null);
    setPhase("idle");
    setSeconds(0);
  }

  return (
    <div className="camera-capture">
      <p>
        Allow camera access, preview the road, and record up to {MAX_SECONDS}{" "}
        seconds. Audio is off.
      </p>
      {kind === "dashcam" && (
        <small>
          Connect a USB dashcam recognized as a camera. Network dashcams use
          Stream URL.
        </small>
      )}
      {error && <p role="alert">{error}</p>}
      {devices.length > 0 &&
        ["ready", "recording", "stopping"].includes(phase) && (
          <label>
            Camera device
            <select
              value={deviceId}
              onChange={(event) => enableCamera(event.target.value)}
              disabled={disabled || phase !== "ready"}
            >
              {devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
      {["ready", "recording", "stopping"].includes(phase) && (
        <video
          ref={preview}
          autoPlay
          muted
          playsInline
          aria-label="Live camera preview"
        />
      )}
      {recordedUrl && (
        <video
          src={recordedUrl}
          controls
          playsInline
          aria-label="Recorded camera clip"
        />
      )}
      <div className="panel__actions">
        {phase === "idle" && (
          <button
            type="button"
            className="button button--secondary"
            disabled={disabled}
            onClick={() => enableCamera()}
          >
            Enable camera
          </button>
        )}
        {phase === "requesting" && (
          <span role="status">Waiting for camera permission…</span>
        )}
        {phase === "ready" && (
          <button
            type="button"
            className="button button--primary"
            disabled={disabled}
            onClick={startRecording}
          >
            Start recording
          </button>
        )}
        {phase === "recording" && (
          <button
            type="button"
            className="button button--danger"
            disabled={disabled}
            onClick={stopRecording}
          >
            Stop recording ({seconds}s / {MAX_SECONDS}s)
          </button>
        )}
        {phase === "stopping" && (
          <span role="status">Preparing recorded clip…</span>
        )}
        {phase === "recorded" && (
          <button
            type="button"
            className="button button--secondary"
            disabled={disabled}
            onClick={retake}
          >
            Record another clip
          </button>
        )}
      </div>
      {file && (
        <small role="status">Clip ready. Submit the form to analyze it.</small>
      )}
    </div>
  );
}
