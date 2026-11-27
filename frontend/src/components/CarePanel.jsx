import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { CATEGORY } from "../careNames";
import { showDate } from "../petAge";
import CareForm from "./CareForm";
import RecordSection from "./RecordSection";

const DUE = {
  OVERDUE: ["Overdue", "care-overdue"],
  DUE_SOON: ["Due soon", "care-soon"],
  UP_TO_DATE: ["Up to date", "care-ok"],
};

const FILTERS = [["", "All"], ...Object.entries(CATEGORY)];

/** PET-3 (US-3): the Vaccinations & treatments section of a pet's page — coming up, history, add / edit / delete. */
export default function CarePanel({ pet }) {
  const [records, setRecords] = useState(null); // null while loading
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | {} (new) | { record } | { nextDoseOf }
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const listUrl = `/pets/${pet.id}/care/`;

  // One request for both lists: "coming up" needs every category, the history filters on screen.
  function load() {
    return apiFetch(listUrl)
      .then((data) => {
        setRecords(data);
        setError("");
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, [pet.id]);

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

  // AC6: the current dose of each care that has a next date, soonest first.
  const comingUp = (records ?? []).filter((r) => r.due_status).sort((a, b) => a.next_due.localeCompare(b.next_due));
  const history = (records ?? []).filter((r) => !filter || r.category === filter);

  return (
    <RecordSection
      id="care"
      title="Vaccinations & treatments"
      action={
        !editing && (
          <button type="button" className="btn-line btn-small" onClick={() => setEditing({})}>
            Add
          </button>
        )
      }
    >

      {error && <div className="error-alert" role="alert">{error}</div>}

      {editing ? (
        <CareForm
          pet={pet}
          record={editing.record ?? null}
          nextDoseOf={editing.nextDoseOf ?? null}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            await load();
            setEditing(null);
          }}
        />
      ) : (
        <>
          {comingUp.length > 0 && (
            <>
              <h4 className="care-subtitle">Coming up</h4>
              <ul className="med-list">
                {comingUp.map((record) => {
                  const [label, tone] = DUE[record.due_status];
                  return (
                    <li key={record.id} className="med-card">
                      <div className="med-card-main">
                        <strong>{record.name}</strong>
                        <span className="sym-tags">
                          <span className={`sym-badge ${tone}`}>{label}</span>
                          <span className="sym-status">Due {showDate(record.next_due)}</span>
                        </span>
                        <small>Last given {showDate(record.given_on)}</small>
                      </div>
                      <div className="med-card-actions">
                        <button type="button" className="btn-line btn-small" onClick={() => setEditing({ nextDoseOf: record })}
                          aria-label={`Record next dose of ${record.name}`}>
                          Record next dose
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <h4 className="care-subtitle">History</h4>
          <div className="sym-filter" role="group" aria-label="Show vaccinations and treatments">
            {FILTERS.map(([value, label]) => (
              <button key={label} type="button" className="btn-line btn-small" aria-pressed={filter === value}
                onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>

          {records && history.length === 0 ? (
            <p className="med-empty">
              {filter
                ? `No ${CATEGORY[filter].toLowerCase()} records.`
                : `Nothing recorded yet. Add ${pet.name}’s vaccinations and flea, tick or worm treatments to see when the next one is due.`}
            </p>
          ) : (
            <ul className="med-list">
              {history.map((record) => (
                <li key={record.id} className="med-card">
                  <div className="med-card-main">
                    <small>
                      <time dateTime={record.given_on}>{showDate(record.given_on)}</time>
                      {" · "}{CATEGORY[record.category]}
                      {record.given_by && ` · ${record.given_by}`}
                    </small>
                    <strong>{record.name}</strong>
                    {record.next_due && <span>Next due {showDate(record.next_due)}</span>}
                    {record.notes && <small className="sym-notes">{record.notes}</small>}
                  </div>
                  {record.mine && (
                    <div className="med-card-actions">
                      <button type="button" className="btn-line btn-small" onClick={() => setEditing({ record })}
                        aria-label={`Edit ${record.name} on ${showDate(record.given_on)}`}>
                        Edit
                      </button>
                      <button type="button" className="btn-line btn-line-danger btn-small" onClick={() => askToDelete(record)}
                        aria-label={`Delete ${record.name} on ${showDate(record.given_on)}`}>
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

      <dialog ref={dialogRef} className="pet-dialog" aria-labelledby="care-delete-title">
        <h3 id="care-delete-title">Delete this record?</h3>
        <p>
          {toDelete?.name} on {toDelete && showDate(toDelete.given_on)} will be removed for good.
        </p>
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
    </RecordSection>
  );
}
