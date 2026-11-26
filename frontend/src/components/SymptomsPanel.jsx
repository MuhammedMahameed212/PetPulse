import React, { useEffect, useRef, useState } from "react";
import { apiFetch, errorText } from "../api";
import { showDateTime } from "../petAge";
import AttachmentView from "./AttachmentView";
import SymptomForm, { SEVERITY } from "./SymptomForm";

const FILTERS = [
  ["", "All"],
  ["ONGOING", "Ongoing"],
  ["RESOLVED", "Resolved"],
];

/** PET-6 (US-6): the Symptoms section of a pet's page — history, filter, add / edit / delete. */
export default function SymptomsPanel({ pet }) {
  const [records, setRecords] = useState(null); // null while loading
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | a record
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const listUrl = `/pets/${pet.id}/symptoms/`;

  // AC4: the history, newest first; the server applies the filter.
  function load() {
    return apiFetch(filter ? `${listUrl}?status=${filter}` : listUrl)
      .then((data) => {
        setRecords(data);
        setError("");
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, [pet.id, filter]);

  async function toggleStatus(record) {
    setBusy(true);
    setError("");
    try {
      const status = record.status === "ONGOING" ? "RESOLVED" : "ONGOING";
      await apiFetch(`${listUrl}${record.id}/`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (err) {
      setError(errorText(err));
    }
    await load();
    setBusy(false);
  }

  function askToDelete(record) {
    setToDelete(record);
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

  const emptyText = filter
    ? `No ${filter === "ONGOING" ? "ongoing" : "resolved"} symptoms.`
    : `No symptoms recorded yet. Note anything unusual so you can show ${pet.name}’s vet how it developed.`;

  return (
    <section className="med-section" aria-labelledby="symptoms-title">
      <div className="med-head">
        <h3 id="symptoms-title" className="pet-records-title">Symptoms</h3>
        {!editing && (
          <button type="button" className="btn-line btn-small" onClick={() => setEditing("new")}>
            Add symptom
          </button>
        )}
      </div>

      {error && <div className="error-alert" role="alert">{error}</div>}

      {editing ? (
        <SymptomForm
          petId={pet.id}
          record={editing === "new" ? null : editing}
          onCancel={async () => {
            await load(); // a cancelled form may already have saved the record (e.g. a file upload failed)
            setEditing(null);
          }}
          onSaved={async () => {
            await load();
            setEditing(null);
          }}
        />
      ) : (
        <>
          <div className="sym-filter" role="group" aria-label="Show symptoms">
            {FILTERS.map(([value, label]) => (
              <button
                key={label}
                type="button"
                className="btn-line btn-small"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {records?.length === 0 ? (
            <p className="med-empty">{emptyText}</p>
          ) : (
            <ul className="med-list">
              {records?.map((record) => (
                <li key={record.id} className={record.status === "RESOLVED" ? "med-card med-ended" : "med-card"}>
                  <div className="med-card-main">
                    <small>
                      <time dateTime={record.occurred_at}>{showDateTime(record.occurred_at)}</time>
                      {" · "}by {record.created_by}
                    </small>
                    <strong>{record.description}</strong>
                    <span className="sym-tags">
                      <span className={`sym-badge sym-${record.severity.toLowerCase()}`}>{SEVERITY[record.severity]}</span>
                      <span className="sym-status">{record.status === "RESOLVED" ? "Resolved" : "Ongoing"}</span>
                    </span>
                    {record.notes && <small className="sym-notes">{record.notes}</small>}
                    {record.attachments.length > 0 && (
                      <ul className="sym-files">
                        {record.attachments.map((attachment, i) => (
                          <li key={attachment.id}>
                            <AttachmentView url={`${listUrl}${record.id}/attachments/${attachment.id}/`} attachment={attachment}
                              label={`${attachment.kind === "VIDEO" ? "Video" : "Photo"} ${i + 1} of ${record.description}`} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {record.mine && (
                    <div className="med-card-actions">
                      <button type="button" className="btn-line btn-small" onClick={() => toggleStatus(record)} disabled={busy}
                        aria-label={`${record.status === "ONGOING" ? "Mark resolved" : "Reopen"}: ${record.description}`}>
                        {record.status === "ONGOING" ? "Mark resolved" : "Reopen"}
                      </button>
                      <button type="button" className="btn-line btn-small" onClick={() => setEditing(record)}
                        aria-label={`Edit ${record.description}`}>
                        Edit
                      </button>
                      <button type="button" className="btn-line btn-line-danger btn-small" onClick={() => askToDelete(record)}
                        aria-label={`Delete ${record.description}`}>
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <dialog ref={dialogRef} className="pet-dialog" aria-labelledby="sym-delete-title">
        <h3 id="sym-delete-title">Delete this record?</h3>
        <p>“{toDelete?.description}” and its photos and videos will be removed for good.</p>
        {deleteError && <div className="error-alert" role="alert">{deleteError}</div>}
        <div className="form-actions">
          <button type="button" className="btn-3d btn-inline btn-danger" onClick={handleDelete}>
            Delete record
          </button>
          <button type="button" className="btn-line" onClick={() => dialogRef.current.close()} ref={cancelRef}>
            Cancel
          </button>
        </div>
      </dialog>
    </section>
  );
}
