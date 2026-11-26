import React, { useEffect, useState } from "react";
import { apiFetch, errorText } from "../api";
import { localDateTime } from "../petAge";
import AttachmentView, { MediaPreview } from "./AttachmentView";

export const SEVERITY = { MILD: "Mild", MODERATE: "Moderate", SEVERE: "Severe" };

// The same limits the server enforces (symptoms/views.py, symptoms/media.py); checked here for quick messages.
const MAX_FILES = 3;
const MB = 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm";

const isVideo = (file) => file.type.startsWith("video/");

function initialForm(record) {
  if (!record) {
    return { occurred_at: localDateTime(), description: "", severity: "MILD", status: "ONGOING", notes: "" };
  }
  return { ...record, occurred_at: localDateTime(new Date(record.occurred_at)) };
}

/** A photo or video picked in the form but not uploaded yet. */
function NewFilePreview({ file, label }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <MediaPreview src={src} kind={isVideo(file) ? "VIDEO" : "IMAGE"} label={label} />;
}

/** PET-6 (AC1, AC2, AC3, AC5): add or edit a symptom record and its photos/video. `record` is null when adding. */
export default function SymptomForm({ petId, record, onSaved, onCancel }) {
  const [form, setForm] = useState(() => initialForm(record));
  const [saved, setSaved] = useState(record); // the record once it exists on the server
  const [kept, setKept] = useState(record?.attachments ?? []); // stored files still wanted
  const [removed, setRemoved] = useState([]); // stored files to delete on save
  const [added, setAdded] = useState([]); // new File objects to upload on save
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const fileCount = kept.length + added.length;
  const hasVideo = kept.some((a) => a.kind === "VIDEO") || added.some(isVideo);

  function pickFiles(e) {
    const picked = [...e.target.files];
    e.target.value = ""; // picking the same file again still fires onChange
    let video = hasVideo;
    const accepted = [];
    for (const file of picked) {
      let problem = "";
      if (fileCount + accepted.length >= MAX_FILES) problem = `A record can have at most ${MAX_FILES} files.`;
      else if (isVideo(file) && video) problem = "A record can have only one video.";
      else if (isVideo(file) && file.size > 10 * MB) problem = `“${file.name}” is over 10 MB.`;
      else if (!isVideo(file) && file.size > 5 * MB) problem = `“${file.name}” is over 5 MB.`;
      if (problem) {
        setError(problem);
        break;
      }
      video ||= isVideo(file);
      accepted.push(file);
    }
    if (accepted.length === picked.length) setError("");
    setAdded([...added, ...accepted]);
  }

  function removeStored(attachment) {
    setKept(kept.filter((a) => a !== attachment));
    setRemoved([...removed, attachment]);
  }

  // Saves the record first, then each file on its own, so a failed upload never loses the record.
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body = {
      occurred_at: new Date(form.occurred_at).toISOString(), // the browser's local time → UTC
      description: form.description,
      severity: form.severity,
      status: form.status,
      notes: form.notes,
    };
    let current;
    try {
      current = await apiFetch(saved ? `/pets/${petId}/symptoms/${saved.id}/` : `/pets/${petId}/symptoms/`, {
        method: saved ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setSaved(current);
      for (const attachment of removed) {
        await apiFetch(`/pets/${petId}/symptoms/${current.id}/attachments/${attachment.id}/`, { method: "DELETE" });
      }
      setRemoved([]);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
      return;
    }

    const uploaded = [];
    const failed = [];
    for (const file of added) {
      const data = new FormData();
      data.append("file", file);
      try {
        uploaded.push(await apiFetch(`/pets/${petId}/symptoms/${current.id}/attachments/`, { method: "POST", body: data }));
      } catch (err) {
        failed.push(file);
        setError(`The symptom was saved, but “${file.name}” wasn’t: ${errorText(err)}`);
      }
    }
    if (failed.length) {
      setKept([...kept, ...uploaded]);
      setAdded(failed);
      setSaving(false);
      return;
    }
    onSaved(current);
  }

  return (
    <form className="med-form" onSubmit={handleSubmit}>
      <h4 className="med-form-title">{record ? "Edit symptom" : "Add a symptom"}</h4>
      {error && <div className="error-alert" role="alert">{error}</div>}

      <label htmlFor="sym-description">What did you notice?</label>
      <input id="sym-description" className="layer-3-input" value={form.description} onChange={set("description")}
        maxLength={200} placeholder="Limping on the front left leg" required />

      <div className="row-2">
        <div>
          <label htmlFor="sym-when">When</label>
          <input id="sym-when" type="datetime-local" className="layer-3-input" value={form.occurred_at}
            onChange={set("occurred_at")} max={localDateTime()} required />
        </div>
        <div>
          <label htmlFor="sym-severity">Severity</label>
          <select id="sym-severity" className="layer-3-input" value={form.severity} onChange={set("severity")}>
            {Object.entries(SEVERITY).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="sym-status">Status</label>
      <select id="sym-status" className="layer-3-input" value={form.status} onChange={set("status")}>
        <option value="ONGOING">Ongoing</option>
        <option value="RESOLVED">Resolved</option>
      </select>

      <label htmlFor="sym-notes">Notes (optional)</label>
      <textarea id="sym-notes" className="layer-3-input sym-notes-input" value={form.notes} onChange={set("notes")}
        maxLength={2000} rows={4} placeholder="Started after the park. Not putting weight on it." />

      <span className="sym-files-label">Photos and video (optional)</span>
      {fileCount > 0 && (
        <ul className="sym-files">
          {kept.map((attachment, i) => (
            <li key={`kept-${attachment.id}`}>
              <AttachmentView url={`/pets/${petId}/symptoms/${saved.id}/attachments/${attachment.id}/`}
                attachment={attachment} label={`File ${i + 1}`} />
              <button type="button" className="btn-line btn-line-danger btn-small" onClick={() => removeStored(attachment)}
                aria-label={`Remove file ${i + 1}`}>
                Remove
              </button>
            </li>
          ))}
          {added.map((file, i) => (
            <li key={`new-${i}-${file.name}`}>
              <NewFilePreview file={file} label={file.name} />
              <button type="button" className="btn-line btn-line-danger btn-small"
                onClick={() => setAdded(added.filter((f) => f !== file))} aria-label={`Remove ${file.name}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="photo-actions sym-file-actions">
        <input id="sym-files" type="file" accept={ACCEPT} multiple className="visually-hidden" onChange={pickFiles}
          disabled={fileCount >= MAX_FILES} />
        {fileCount < MAX_FILES && (
          <label htmlFor="sym-files" className="btn-line btn-small">
            {fileCount ? "Add more" : "Add photos or a video"}
          </label>
        )}
        <p className="field-hint">
          Up to {MAX_FILES} files: JPEG, PNG or WebP photos (5 MB each) and one MP4, MOV or WebM video (10 MB).
        </p>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-3d btn-inline" disabled={saving}>
          {saving ? "Saving…" : "Save symptom"}
        </button>
        <button type="button" className="btn-line" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
