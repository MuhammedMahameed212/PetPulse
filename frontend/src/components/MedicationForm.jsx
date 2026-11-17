import React, { useState } from "react";
import { apiFetch, errorText } from "../api";
import { localToday } from "../petAge";

const MAX_TIMES = 6; // same limit as the API

function initialForm(med) {
  if (!med) {
    return { name: "", dosage: "", frequency: "DAILY", dose_times: ["08:00"], start_date: localToday(), end_date: "", notes: "" };
  }
  return { ...med, dose_times: med.dose_times.length ? med.dose_times : ["08:00"], end_date: med.end_date || "" };
}

/** PET-4 (AC1–AC3): add or edit a pet's medicine. `med` is null when adding. */
export default function MedicationForm({ petId, med, onSaved, onCancel }) {
  const [form, setForm] = useState(() => initialForm(med));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const daily = form.frequency === "DAILY";

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function setTime(i, value) {
    setForm({ ...form, dose_times: form.dose_times.map((t, j) => (j === i ? value : t)) });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body = {
      name: form.name,
      dosage: form.dosage,
      frequency: form.frequency,
      dose_times: daily ? form.dose_times : [],
      start_date: form.start_date,
      end_date: form.end_date || null,
      notes: form.notes,
    };
    try {
      const saved = await apiFetch(med ? `/pets/${petId}/medications/${med.id}/` : `/pets/${petId}/medications/`, {
        method: med ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSaved(saved);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <form className="med-form" onSubmit={handleSubmit}>
      <h4 className="med-form-title">{med ? `Edit ${med.name}` : "Add a medication"}</h4>
      {error && <div className="error-alert" role="alert">{error}</div>}

      <div className="row-2">
        <div>
          <label htmlFor="med-name">Medicine name</label>
          <input id="med-name" className="layer-3-input" value={form.name} onChange={set("name")} maxLength={100} required />
        </div>
        <div>
          <label htmlFor="med-dosage">Dosage</label>
          <input id="med-dosage" className="layer-3-input" value={form.dosage} onChange={set("dosage")} maxLength={60} placeholder="1 tablet (25 mg)" required />
        </div>
      </div>

      <label htmlFor="med-frequency">How often</label>
      <select id="med-frequency" className="layer-3-input" value={form.frequency} onChange={set("frequency")}>
        <option value="DAILY">Daily at set times</option>
        <option value="AS_NEEDED">As needed</option>
      </select>

      {daily && (
        <fieldset className="med-times">
          <legend>Dose times</legend>
          {form.dose_times.map((time, i) => (
            <div className="med-time-row" key={i}>
              <input
                type="time"
                className="layer-3-input"
                value={time}
                onChange={(e) => setTime(i, e.target.value)}
                aria-label={`Dose time ${i + 1}`}
                required
              />
              {form.dose_times.length > 1 && (
                <button
                  type="button"
                  className="btn-line btn-small"
                  onClick={() => setForm({ ...form, dose_times: form.dose_times.filter((_, j) => j !== i) })}
                  aria-label={`Remove dose time ${i + 1}`}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {form.dose_times.length < MAX_TIMES && (
            <button
              type="button"
              className="btn-line btn-small"
              onClick={() => setForm({ ...form, dose_times: [...form.dose_times, "20:00"] })}
            >
              Add a time
            </button>
          )}
        </fieldset>
      )}

      <div className="row-2">
        <div>
          <label htmlFor="med-start">Start date</label>
          <input id="med-start" type="date" className="layer-3-input" value={form.start_date} onChange={set("start_date")} required />
        </div>
        <div>
          <label htmlFor="med-end">End date (optional)</label>
          <input id="med-end" type="date" className="layer-3-input" value={form.end_date} onChange={set("end_date")} min={form.start_date} />
        </div>
      </div>

      <label htmlFor="med-notes">Notes (optional)</label>
      <input id="med-notes" className="layer-3-input" value={form.notes} onChange={set("notes")} maxLength={300} placeholder="Give with food" />

      <div className="form-actions">
        <button type="submit" className="btn-3d btn-inline" disabled={saving}>
          {saving ? "Saving…" : "Save medication"}
        </button>
        <button type="button" className="btn-line" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
