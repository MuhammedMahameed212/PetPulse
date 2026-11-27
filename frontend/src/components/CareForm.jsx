import React, { useState } from "react";
import { apiFetch, errorText } from "../api";
import { CATEGORY, careNames } from "../careNames";
import { localToday } from "../petAge";

const EMPTY = { category: "VACCINE", name: "", given_by: "", notes: "" };

/**
 * PET-3 (AC1, AC2, AC4): add or edit a vaccination or treatment.
 * `record` is null when adding; `nextDoseOf` (a record) fills in its category and name for its next dose.
 */
export default function CareForm({ pet, record, nextDoseOf, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    given_on: localToday(),
    ...(nextDoseOf && { category: nextDoseOf.category, name: nextDoseOf.name, given_by: nextDoseOf.given_by }),
    ...record,
    next_due: record?.next_due ?? "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const suggestions = careNames(pet.species, form.category);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body = {
      category: form.category,
      name: form.name,
      given_on: form.given_on,
      next_due: form.next_due || null,
      given_by: form.given_by,
      notes: form.notes,
    };
    try {
      const saved = await apiFetch(record ? `/pets/${pet.id}/care/${record.id}/` : `/pets/${pet.id}/care/`, {
        method: record ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSaved(saved);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  const title = record ? `Edit ${record.name}` : nextDoseOf ? `Next dose of ${nextDoseOf.name}` : "Add a vaccination or treatment";

  return (
    <form className="med-form" onSubmit={handleSubmit}>
      <h4 className="med-form-title">{title}</h4>
      {error && <div className="error-alert" role="alert">{error}</div>}

      <div className="row-2">
        <div>
          <label htmlFor="care-category">Type</label>
          <select id="care-category" className="layer-3-input" value={form.category} onChange={set("category")}>
            {Object.entries(CATEGORY).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="care-name">Name</label>
          <input id="care-name" className="layer-3-input" value={form.name} onChange={set("name")} maxLength={100}
            list="care-name-options" placeholder={suggestions[0] ?? "e.g. Ear cleaning"} required />
          <datalist id="care-name-options">
            {suggestions.map((name) => <option key={name} value={name} />)}
          </datalist>
        </div>
      </div>

      <div className="row-2">
        <div>
          <label htmlFor="care-given-on">Date given</label>
          <input id="care-given-on" type="date" className="layer-3-input" value={form.given_on} onChange={set("given_on")}
            max={localToday()} required />
        </div>
        <div>
          <label htmlFor="care-next-due">Next due (optional)</label>
          <input id="care-next-due" type="date" className="layer-3-input" value={form.next_due} onChange={set("next_due")}
            min={form.given_on || undefined} />
        </div>
      </div>

      <label htmlFor="care-given-by">Given by (optional)</label>
      <input id="care-given-by" className="layer-3-input" value={form.given_by} onChange={set("given_by")} maxLength={100}
        placeholder="Clinic or vet" />

      <label htmlFor="care-notes">Notes (optional)</label>
      <textarea id="care-notes" className="layer-3-input sym-notes-input" value={form.notes} onChange={set("notes")}
        maxLength={2000} rows={3} placeholder="Batch number, reactions…" />

      <div className="form-actions">
        <button type="submit" className="btn-3d btn-inline" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-line" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
