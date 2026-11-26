import React, { useRef, useState } from "react";
import { apiFetch } from "../api";
import { petAge, showDate } from "../petAge";
import MedicationsPanel from "./MedicationsPanel";
import RemindersPanel from "./RemindersPanel";
import SymptomsPanel from "./SymptomsPanel";
import { PetAvatar, SPECIES } from "./PetList";

// AC6: the profile is the entry point to these records; each arrives in its own user story.
const RECORDS = [
  ["Medical file", "Visits, diagnoses and lab results."],
  ["Treatments", "Flea, tick and worm treatments on a schedule."],
  ["Documents", "Reports and certificates from the clinic."],
];

export default function PetProfile({ pet, onBack, onEdit, onDeleted }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function askToDelete() {
    dialogRef.current.showModal();
    cancelRef.current.focus(); // safe default: Enter must not delete
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await apiFetch(`/pets/${pet.id}/`, { method: "DELETE" });
      dialogRef.current.close();
      onDeleted(pet.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="layer-3-card pet-profile">
      <button type="button" className="back-to-home-btn" onClick={onBack}>
        Back to my pets
      </button>

      <header className="pet-profile-head">
        <PetAvatar pet={pet} size="lg" />
        <div className="pet-profile-title">
          <h2 className="welcome-heading">{pet.name}</h2>
          <p>{[SPECIES[pet.species], pet.breed].filter(Boolean).join(", ")}</p>
        </div>
        <div className="form-actions pet-profile-actions">
          <button type="button" className="btn-line" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn-line btn-line-danger" onClick={askToDelete}>
            Delete
          </button>
        </div>
      </header>

      <dl className="user-info-grid pet-facts">
        <div className="info-pill">
          <dt className="info-label">Age</dt>
          <dd>{petAge(pet.birth_date, pet.birth_date_is_estimate)}</dd>
        </div>
        <div className="info-pill">
          <dt className="info-label">Birth date</dt>
          <dd>
            {showDate(pet.birth_date)}
            {pet.birth_date_is_estimate && " (approximate)"}
          </dd>
        </div>
        <div className="info-pill">
          <dt className="info-label">Weight</dt>
          <dd>{Number(pet.weight_kg)} kg</dd>
        </div>
      </dl>

      <MedicationsPanel pet={pet} />
      <SymptomsPanel pet={pet} />
      <RemindersPanel pet={pet} />

      <h3 className="pet-records-title">{pet.name}’s other records</h3>
      <ul className="pet-records">
        {RECORDS.map(([title, body]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{body}</span>
            <small>Coming in a later release</small>
          </li>
        ))}
      </ul>

      <dialog ref={dialogRef} className="pet-dialog" aria-labelledby="delete-title" onClose={() => setError("")}>
        <h3 id="delete-title">Delete {pet.name}?</h3>
        <p>This removes {pet.name}’s profile for good. You can’t undo it.</p>
        {error && <div className="error-alert" role="alert">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn-3d btn-inline btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : `Delete ${pet.name}`}
          </button>
          <button type="button" className="btn-line" onClick={() => dialogRef.current.close()} ref={cancelRef}>
            Cancel
          </button>
        </div>
      </dialog>
    </div>
  );
}
