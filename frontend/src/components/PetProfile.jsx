import React, { Suspense, lazy, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api";
import { petTag } from "../fx3d";
import { petAge, showDate } from "../petAge";
import MedicationsPanel from "./MedicationsPanel";
import RemindersPanel from "./RemindersPanel";
import SymptomsPanel from "./SymptomsPanel";
import { PetAvatar, SPECIES } from "./PetList";

// The landing page's three.js collar tag, loaded only when a pet page opens; without WebGL it renders nothing.
const CollarTag3D = lazy(() => import("./CollarTag3D").catch(() => ({ default: () => null })));

// PET-1 AC6: the profile is the entry point to these records; each arrives in its own user story.
const RECORDS = ["the medical file", "treatments", "documents"];

/** The hero's one fact line: "Labrador · 4 yrs · 28.4 kg · born 02/03/2022" ("about" for an estimated birth). */
function facts(pet) {
  return [
    pet.breed || SPECIES[pet.species],
    petAge(pet.birth_date, pet.birth_date_is_estimate),
    `${Number(pet.weight_kg)}\u00a0kg`, // keep the number and unit together
    `born ${pet.birth_date_is_estimate ? "about " : ""}${showDate(pet.birth_date)}`,
  ];
}

export default function PetProfile({ pet, onBack, onEdit, onDeleted }) {
  // Rebuilt only when what's engraved changes; a new object every render would make the tag spin.
  const tag = useMemo(() => petTag(pet), [pet.id, pet.name, pet.species]);
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

      <header className={`pet-hero pet-tone-${pet.species.toLowerCase()}`}>
        <div className="pet-hero-main">
          <PetAvatar pet={pet} size="lg" />
          <div className="pet-profile-title">
            <h2 className="welcome-heading">{pet.name}</h2>
            <p className="pet-hero-facts">{facts(pet).join(" · ")}</p>
            <div className="form-actions pet-profile-actions">
              <button type="button" className="btn-line btn-small" onClick={onEdit}>
                Edit
              </button>
              <button type="button" className="btn-line btn-line-danger btn-small" onClick={askToDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
        <div className="pet-hero-tag">
          <Suspense fallback={<div className="pp-tag-canvas" />}>
            <CollarTag3D pet={tag} />
          </Suspense>
          <p className="pet-hero-hint">Drag to flip {pet.name}’s tag</p>
        </div>
      </header>

      <nav className="pet-jump" aria-label={`${pet.name}’s records`}>
        <a href="#meds-title">Medications</a>
        <a href="#symptoms-title">Symptoms</a>
        <a href="#reminders-title">Reminders</a>
      </nav>

      <MedicationsPanel pet={pet} />
      <SymptomsPanel pet={pet} />
      <RemindersPanel pet={pet} />

      <p className="pet-coming">Coming soon: {RECORDS.join(", ")}.</p>

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
