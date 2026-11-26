import React, { useEffect, useRef, useState } from "react";
import { apiFetch, errorText } from "../api";
import { showDate, showDateTime } from "../petAge";
import { KINDS, REPEATS, announceDueChanged } from "../reminders";
import ReminderForm from "./ReminderForm";

const FILTERS = [
  ["open", "Upcoming"],
  ["done", "Done"],
];

/** PET-5 (US-5): the Reminders section of a pet's page — upcoming / done, add / edit / delete. */
export default function RemindersPanel({ pet }) {
  const [filter, setFilter] = useState("open");
  const [reminders, setReminders] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | a reminder
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [doneError, setDoneError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const headingRef = useRef(null);
  const listUrl = `/pets/${pet.id}/reminders/`;

  // AC5: upcoming soonest first, or done latest first; the server sorts and filters.
  function load() {
    return apiFetch(`${listUrl}?status=${filter}`)
      .then((data) => {
        setReminders(data);
        setLoadError("");
      })
      .catch((err) => setLoadError(err.message));
  }

  useEffect(() => {
    load();
  }, [pet.id, filter]);

  // Opening the form or the delete dialog starts a new action, so the last "Done…" message goes.
  function openForm(target) {
    setNotice("");
    setEditing(target);
  }

  // The button just used goes away with its card or form; keep keyboard users in this section.
  const focusSection = () => headingRef.current?.focus();

  // AC7: mark it done; a repeating reminder comes back, so say when.
  async function markDone(reminder) {
    setDoneError("");
    setNotice("");
    setBusy(true);
    try {
      const { next } = await apiFetch(`${listUrl}${reminder.id}/done/`, { method: "POST" });
      setNotice(next ? `Done. Next one: ${showDateTime(next.due_at)}.` : `“${reminder.title}” marked done.`);
      announceDueChanged();
    } catch (err) {
      setDoneError(errorText(err));
    }
    await load();
    setBusy(false);
    focusSection();
  }

  function askToDelete(reminder) {
    setNotice("");
    setToDelete(reminder);
    setDeleteError("");
    dialogRef.current.showModal();
    cancelRef.current.focus(); // safe default: Enter must not delete
  }

  async function handleDelete() {
    try {
      await apiFetch(`${listUrl}${toDelete.id}/`, { method: "DELETE" });
      dialogRef.current.close();
      announceDueChanged();
      await load();
      focusSection();
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  const emptyText = filter === "done"
    ? "No done reminders yet."
    : `No upcoming reminders. Add one so you don’t miss ${pet.name}’s next vaccine, treatment or visit.`;

  return (
    <section className="med-section" aria-labelledby="reminders-title">
      <div className="med-head">
        <h3 id="reminders-title" className="pet-records-title" ref={headingRef} tabIndex={-1}>Reminders</h3>
        {!editing && (
          <button type="button" className="btn-line btn-small" onClick={() => openForm("new")}>
            Add reminder
          </button>
        )}
      </div>

      {loadError && <div className="error-alert" role="alert">{loadError}</div>}

      {editing ? (
        <ReminderForm
          petId={pet.id}
          reminder={editing === "new" ? null : editing}
          onCancel={() => {
            setEditing(null);
            focusSection();
          }}
          onSaved={async () => {
            announceDueChanged();
            await load();
            setEditing(null);
            focusSection();
          }}
        />
      ) : (
        <>
          <div className="sym-filter" role="group" aria-label="Show reminders">
            {FILTERS.map(([value, label]) => (
              <button key={value} type="button" className="btn-line btn-small" aria-pressed={filter === value}
                onClick={() => { setFilter(value); setNotice(""); }}>
                {label}
              </button>
            ))}
          </div>

          {doneError && <div className="error-alert" role="alert">{doneError}</div>}
          <p className="rem-notice" role="status">{notice}</p>

          {reminders?.length === 0 ? (
            <p className="med-empty">{emptyText}</p>
          ) : (
            <ul className="med-list">
              {reminders?.map((r) => (
                <li key={r.id} className={r.done_at ? "med-card med-ended" : r.is_due ? "med-card rem-due" : "med-card"}>
                  <div className="med-card-main">
                    <span className="sym-tags">
                      <span className="sym-badge rem-kind">{KINDS[r.kind]}</span>
                      {r.is_due && <span className="sym-badge sym-severe">Overdue</span>}
                    </span>
                    <strong>{r.title}</strong>
                    <span>
                      <time dateTime={r.due_at}>{showDateTime(r.due_at)}</time>
                      {r.repeat !== "NONE" && ` · ${REPEATS[r.repeat]}`}
                    </span>
                    {/* due_at comes in the server's time zone, so its date is the day the server's rule uses */}
                    {!r.done_at && !r.can_mark_done && <small>Can be marked done from {showDate(r.due_at.slice(0, 10))}</small>}
                    {r.medication_name && <small>Linked to {r.medication_name}</small>}
                    {r.done_at && <small>Done {showDateTime(r.done_at)} by {r.done_by}</small>}
                    {r.notes && <small className="sym-notes">{r.notes}</small>}
                  </div>
                  <div className="med-card-actions">
                    {!r.done_at && (
                      <>
                        {r.can_mark_done && (
                          <button type="button" className="btn-3d btn-inline btn-small" onClick={() => markDone(r)} disabled={busy}
                            aria-label={`Mark ${r.title} as done`}>
                            Mark done
                          </button>
                        )}
                        <button type="button" className="btn-line btn-small" onClick={() => openForm(r)} aria-label={`Edit ${r.title}`}>
                          Edit
                        </button>
                      </>
                    )}
                    <button type="button" className="btn-line btn-line-danger btn-small" onClick={() => askToDelete(r)}
                      aria-label={`Delete ${r.title}`}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <dialog ref={dialogRef} className="pet-dialog" aria-labelledby="rem-delete-title">
        <h3 id="rem-delete-title">Delete {toDelete?.title}?</h3>
        <p>
          {toDelete?.repeat !== "NONE" && !toDelete?.done_at
            ? "This deletes the reminder and stops it repeating."
            : "This removes the reminder for good."}
        </p>
        {deleteError && <div className="error-alert" role="alert">{deleteError}</div>}
        <div className="form-actions">
          <button type="button" className="btn-3d btn-inline btn-danger" onClick={handleDelete}>
            Delete reminder
          </button>
          <button type="button" className="btn-line" onClick={() => dialogRef.current.close()} ref={cancelRef}>
            Cancel
          </button>
        </div>
      </dialog>
    </section>
  );
}
