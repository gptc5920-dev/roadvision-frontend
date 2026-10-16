import { useState } from "react";
import { Icon } from "../icons/Icon";
import { MaskOverlay } from "./MaskEditor";

export function TrackPreview({ track }) {
  const [failedUrls, setFailedUrls] = useState([]);
  const hasMask = track.segmentationPoints?.length >= 3;
  const candidates = hasMask
    ? [track.snapshotFrameUrl, track.snapshotCropUrl]
    : [track.snapshotCropUrl, track.snapshotFrameUrl];
  const source = candidates.find((url) => url && !failedUrls.includes(url));
  const showMask = hasMask && source === track.snapshotFrameUrl;

  if (!source) {
    return (
      <div className="track-card__placeholder" role="status">
        <Icon name="alert" />
        <span>Snapshot unavailable</span>
      </div>
    );
  }

  return (
    <div className="track-card__preview">
      <div className={showMask ? "mask-editor mask-editor--review" : undefined}>
        <img
          key={source}
          src={source}
          alt={
            showMask
              ? "Road defect with mask overlay"
              : source === track.snapshotCropUrl
                ? "Pothole detection crop"
                : "Road defect snapshot"
          }
          onError={() => setFailedUrls((current) => [...current, source])}
        />
        {showMask && (
          <MaskOverlay
            masks={[track.segmentationPoints]}
            source={track.maskSource}
          />
        )}
      </div>
    </div>
  );
}
