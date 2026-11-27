import React, { useEffect, useRef, useState } from "react";
import { apiFetch, errorText } from "../api";
import { showDate } from "../petAge";
import MedicationForm from "./MedicationForm";
import RecordSection from "./RecordSection";

function schedule(med) {
  return med.frequency === "DAILY" ? `daily at ${med.dose_times.join(", ")}` : "as needed";
}

const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function period(med) {
  return med.end_date ? `${showDate(med.start_date)} – ${showDate(med.end_date)}` : `From ${showDate(med.start_date)}, ongoing`;
}

/** PET-4 (US-4): the Medications section of a pet's page. */
export default function MedicationsPanel({ pet }) {
  const [meds, setMeds] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | a medication
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [doseError, setDoseError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const listUrl = `/pets/${pet.id}/medications/`;

  function load() {
    return apiFetch(listUrl)
      .then((data) => {
        setMeds(data);
        setLoadError("");
      })
      .catch((err) => setLoadError(err.message));
  }

  useEffect(() => {
    load();
  }, [pet.id]);

  // AC4: tick today's dose, or undo your own tick; then show the server's state.
  async function doseAction(path, options) {
    setDoseError("");
    setBusy(true);
    try {
      await apiFetch(`${listUrl}${path}`, options);
    } catch (err) {
      setDoseError(errorText(err));
    }
    await load();
    setBusy(false);
  }

  const markGiven = (med, time) =>
    doseAction(`${med.id}/doses/`, { method: "POST", body: JSON.stringify(time ? { scheduled_time: time } : {}) });
  const undo = (med, dose) => doseAction(`${med.id}/doses/${dose.id}/`, { method: "DELETE" });

  function givenLine(med, dose) {
    return (
      <span className="dose-given">
        Given {clock(dose.given_at)} by {dose.given_by}
        {dose.mine && (
          <button type="button" className="link-btn" onClick={() => undo(med, dose)} disabled={busy}
            aria-label={`Undo ${med.name} dose given at ${clock(dose.given_at)}`}>
            Undo
          </button>
        )}
      </span>
    );
  }

  const daily = (meds || []).filter((m) => m.frequency === "DAILY" && m.today.length);
  const asNeeded = (meds || []).filter((m) => m.frequency === "AS_NEEDED" && (m.is_active || m.today.length));

  function askToDelete(med) {
    setToDelete(med);
    setDeleteError("");
    dialogRef.current.showModal();
    cancelRef.current.focus(); // safe default: Enter must not delete
  }

  async function handleDelete() {
    try {
      await apiFetch(`${listUrl}${toDelete.id}/`, { method: "DELETE" });
      dialogRef.current.close();
      await load();
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  return (
    <RecordSection
      id="meds"
      title="Medications"
      action={
        !editing && (
          <button type="button" className="btn-line btn-small" onClick={() => setEditing("new")}>
            Add medication
          </button>
        )
      }
    >

      {loadError && <div className="error-alert" role="alert">{loadError}</div>}

      {!editing && (daily.length > 0 || asNeeded.length > 0) && (
        <div className="med-today">
          <h4 className="med-today-title">Today</h4>
          {doseError && <div className="error-alert" role="alert">{doseError}</div>}
          <ul className="dose-list">
            {daily.flatMap((med) =>
              med.today.map(({ time, dose }) => (
                <li key={`${med.id}-${time}`} className={dose ? "dose-row dose-done" : "dose-row"}>
                  <span className="dose-time">{time}</span>
                  <span className="dose-med"><strong>{med.name}</strong> {med.dosage}</span>
                  {dose ? givenLine(med, dose) : (
                    <button type="button" className="btn-line btn-small" onClick={() => markGiven(med, time)} disabled={busy}
                      aria-label={`Mark ${med.name} ${time} as given`}>
                      Mark as given
                    </button>
                  )}
                </li>
              ))
            )}
            {asNeeded.map((med) => (
              <li key={med.id} className="dose-row">
                <span className="dose-time">As needed</span>
                <span className="dose-med">
                  <strong>{med.name}</strong> {med.dosage}
                  {med.today.map(({ dose }) => <span key={dose.id} className="dose-log">{givenLine(med, dose)}</span>)}
                </span>
                {med.is_active && (
                  <button type="button" className="btn-line btn-small" onClick={() => markGiven(med, null)} disabled={busy}
                    aria-label={`Log a dose of ${med.name}`}>
                    Log a dose
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing ? (
        <MedicationForm
          petId={pet.id}
          med={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            await load();
            setEditing(null);
          }}
        />
      ) : meds?.length === 0 ? (
        <p className="med-empty">No medications yet. Add one to keep track of {pet.name}’s doses.</p>
      ) : (
        <ul className="med-list">
          {meds?.map((med) => (
            <li key={med.id} className={med.is_active ? "med-card" : "med-card med-ended"}>
              <div className="med-card-main">
                <strong>{med.name}</strong>
                <span>{med.dosage}, {schedule(med)}</span>
                <small>{period(med)}</small>
                {!med.is_active && <small className="med-inactive">Not active today</small>}
                {med.notes && <small>{med.notes}</small>}
              </div>
              <div className="med-card-actions">
                <button type="button" className="btn-line btn-small" onClick={() => setEditing(med)} aria-label={`Edit ${med.name}`}>
                  Edit
                </button>
                <button type="button" className="btn-line btn-line-danger btn-small" onClick={() => askToDelete(med)} aria-label={`Delete ${med.name}`}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dialogRef} className="pet-dialog" aria-labelledby="med-delete-title">
        <h3 id="med-delete-title">Delete {toDelete?.name}?</h3>
        <p>This also deletes every dose recorded for it. To stop a course but keep its record, set an end date instead.</p>
        {deleteError && <div className="error-alert" role="alert">{deleteError}</div>}
        <div className="form-actions">
          <button type="button" className="btn-3d btn-inline btn-danger" onClick={handleDelete}>
            Delete medication
          </button>
          <button type="button" className="btn-line" onClick={() => dialogRef.current.close()} ref={cancelRef}>
            Cancel
          </button>
        </div>
      </dialog>
    </RecordSection>
  );
}
