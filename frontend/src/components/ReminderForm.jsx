import React, { useEffect, useState } from "react";
import { apiFetch, errorText } from "../api";
import { localDateTime } from "../petAge";
import { KINDS, REPEATS, defaultDueAt } from "../reminders";

function initialForm(reminder) {
  if (!reminder) {
    return { kind: "VACCINATION", title: "", due_at: defaultDueAt(), repeat: "NONE", medication: "", notes: "" };
  }
  return { ...reminder, due_at: localDateTime(new Date(reminder.due_at)), medication: reminder.medication ?? "" };
}

/** PET-5 (AC1, AC2, AC4): add or edit a pet's reminder. `reminder` is null when adding. */
export default function ReminderForm({ petId, reminder, onSaved, onCancel }) {
  const [form, setForm] = useState(() => initialForm(reminder));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [medicines, setMedicines] = useState(null); // AC6: loaded when the type is Medication
  const isMedication = form.kind === "MEDICATION";

  useEffect(() => {
    if (isMedication && medicines === null) {
      apiFetch(`/pets/${petId}/medications/`).then(setMedicines).catch(() => setMedicines([]));
    }
  }, [isMedication, medicines, petId]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body = {
      kind: form.kind,
      title: form.title,
      due_at: new Date(form.due_at).toISOString(), // the browser's local time → UTC
      repeat: form.repeat,
      medication: isMedication && form.medication ? Number(form.medication) : null,
      notes: form.notes,
    };
    const listUrl = `/pets/${petId}/reminders/`;
    try {
      const saved = await apiFetch(reminder ? `${listUrl}${reminder.id}/` : listUrl, {
        method: reminder ? "PATCH" : "POST",
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
      <h4 className="med-form-title">{reminder ? `Edit ${reminder.title}` : "Add a reminder"}</h4>
      {error && <div className="error-alert" role="alert">{error}</div>}

      <div className="row-2">
        <div>
          <label htmlFor="rem-kind">Type</label>
          <select id="rem-kind" className="layer-3-input" value={form.kind} onChange={set("kind")} autoFocus>
            {Object.entries(KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rem-title">What</label>
          <input id="rem-title" className="layer-3-input" value={form.title} onChange={set("title")} maxLength={100}
            placeholder="Rabies booster" required />
        </div>
      </div>

      <div className="row-2">
        <div>
          <label htmlFor="rem-when">Date and time</label>
          <input id="rem-when" type="datetime-local" className="layer-3-input" value={form.due_at}
            onChange={set("due_at")} required />
        </div>
        <div>
          <label htmlFor="rem-repeat">Repeat</label>
          <select id="rem-repeat" className="layer-3-input" value={form.repeat} onChange={set("repeat")}>
            {Object.entries(REPEATS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      {isMedication && (
        <>
          <label htmlFor="rem-med">Linked medicine (optional)</label>
          <select id="rem-med" className="layer-3-input" value={form.medication} onChange={set("medication")}
            disabled={medicines === null}>
            <option value="">{medicines === null ? "Loading…" : "None"}</option>
            {medicines?.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.dosage})</option>)}
          </select>
          {medicines?.length === 0 && <p className="field-hint">No medicines on this pet yet. Add one in Medications to link it.</p>}
        </>
      )}

      <label htmlFor="rem-notes">Notes (optional)</label>
      <input id="rem-notes" className="layer-3-input" value={form.notes} onChange={set("notes")} maxLength={300}
        placeholder="Bring the vaccine booklet" />

      <div className="form-actions">
        <button type="submit" className="btn-3d btn-inline" disabled={saving}>
          {saving ? "Saving…" : "Save reminder"}
        </button>
        <button type="button" className="btn-line" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
