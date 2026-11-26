import React, { useEffect, useState } from "react";
import { apiBlob } from "../api";

/** Shows a photo or video from a local blob URL, freed when the component goes away. */
export function MediaPreview({ src, kind, label }) {
  if (!src) return <span className="sym-media sym-media-loading" aria-label={`Loading ${label}`} />;
  if (kind === "VIDEO") {
    return <video className="sym-media" src={src} controls preload="metadata" aria-label={label} />;
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} full size`}>
      <img className="sym-media" src={src} alt={label} />
    </a>
  );
}

/** PET-6 (AC3): fetches a stored symptom file with the sign-in token and shows it. */
export default function AttachmentView({ url, attachment, label }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    apiBlob(url)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (failed) return <span className="sym-media sym-media-loading">Couldn’t load</span>;
  return <MediaPreview src={src} kind={attachment.kind} label={label} />;
}
