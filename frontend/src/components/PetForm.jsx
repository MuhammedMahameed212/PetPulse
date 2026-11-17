import React, { useState } from "react";
import { apiFetch } from "../api";
import { SPECIES } from "./PetList";

const EMPTY = { name: "", species: "DOG", breed: "", birth_date: "", birth_date_is_estimate: false, weight_kg: "" };

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Add-a-pet and edit-pet form. `pet` is null when adding. */
export default function PetForm({ pet, onSaved, onCancel }) {
  const [form, setForm] = useState(() =>
    pet ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, pet[k] ?? EMPTY[k]])) : EMPTY
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const saved = await apiFetch(pet ? `/pets/${pet.id}/` : "/pets/", {
        method: pet ? "PATCH" : "POST",
        body: JSON.stringify(form),
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
