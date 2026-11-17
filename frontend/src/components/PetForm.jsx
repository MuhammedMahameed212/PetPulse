import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { localToday } from "../petAge";
import { PetAvatar, SPECIES } from "./PetList";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // same limit as the API

const EMPTY = { name: "", species: "DOG", breed: "", birth_date: "", birth_date_is_estimate: false, weight_kg: "" };

/** Add-a-pet and edit-pet form. `pet` is null when adding. */
export default function PetForm({ pet, onSaved, onCancel }) {
  const [form, setForm] = useState(() =>
    pet ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, pet[k] ?? EMPTY[k]])) : EMPTY
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!photoFile) return setPreviewUrl(null);
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const shownPhoto = previewUrl || (!photoRemoved && pet?.photo) || null;

  function pickPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Photo must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }
    setError("");
    setPhotoFile(file);
    setPhotoRemoved(false);
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoRemoved(true);
    fileRef.current.value = "";
  }

  function requestBody() {
    // JSON unless the photo changed; then multipart so the file can travel with the fields.
    if (!photoFile && !(pet && photoRemoved)) return JSON.stringify(form);
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, String(value)));
    if (photoFile) body.append("photo", photoFile);
    else body.append("remove_photo", "true");
    return body;
  }

  const set = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const saved = await apiFetch(pet ? `/pets/${pet.id}/` : "/pets/", {
        method: pet ? "PATCH" : "POST",
        body: requestBody(),
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="layer-3-card pet-form" onSubmit={handleSubmit}>
      <h2 className="welcome-heading">{pet ? `Edit ${pet.name}` : "Add a pet"}</h2>
      {error && <div className="error-alert" role="alert">{error}</div>}

      <div className="photo-row">
        <PetAvatar pet={{ name: form.name || "?", species: form.species, photo: shownPhoto }} size="lg" />
        <div className="photo-actions">
          <input
            id="pet-photo"
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            onChange={pickPhoto}
          />
          <label htmlFor="pet-photo" className="btn-line btn-small">
            {shownPhoto ? "Change photo" : "Add a photo"}
          </label>
          {shownPhoto && (
            <button type="button" className="btn-line btn-line-danger btn-small" onClick={removePhoto}>
              Remove photo
            </button>
          )}
          <p className="field-hint">Optional. JPEG, PNG or WebP, up to 5 MB.</p>
        </div>
      </div>

      <label htmlFor="pet-name">Name</label>
      <input id="pet-name" className="layer-3-input" value={form.name} onChange={set("name")} maxLength={60} required />

      <div className="row-2">
        <div>
          <label htmlFor="pet-species">Species</label>
          <select id="pet-species" className="layer-3-input" value={form.species} onChange={set("species")}>
            {Object.entries(SPECIES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pet-breed">Breed (optional)</label>
          <input id="pet-breed" className="layer-3-input" value={form.breed} onChange={set("breed")} maxLength={80} />
        </div>
      </div>

      <div className="row-2">
        <div>
          <label htmlFor="pet-birth">Birth date</label>
          <input id="pet-birth" type="date" className="layer-3-input" value={form.birth_date} onChange={set("birth_date")} max={localToday()} required />
          <label className="check-row" htmlFor="pet-birth-estimate">
            <input id="pet-birth-estimate" type="checkbox" checked={form.birth_date_is_estimate} onChange={set("birth_date_is_estimate")} />
            Approximate date
          </label>
        </div>
        <div>
          <label htmlFor="pet-weight">Weight (kg)</label>
          <input id="pet-weight" type="number" inputMode="decimal" step="0.01" min="0.01" max="200" className="layer-3-input" value={form.weight_kg} onChange={set("weight_kg")} required />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-3d btn-inline" disabled={saving}>
          {saving ? "Saving…" : "Save pet"}
        </button>
        <button type="button" className="btn-line" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
