import React from "react";
import { petStatus, relativeDay } from "../dashboard";
import { petAge } from "../petAge";
import useTilt from "../useTilt";

export const SPECIES = { DOG: "Dog", CAT: "Cat", BIRD: "Bird", RABBIT: "Rabbit", OTHER: "Other" };

export function PetAvatar({ pet, size = "md" }) {
  return pet.photo ? (
    <img className={`pet-avatar pet-avatar-${size}`} src={pet.photo} alt="" />
  ) : (
    <span className={`pet-avatar pet-avatar-${size} species-${pet.species.toLowerCase()}`} aria-hidden="true">
      {pet.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** The card's one line about what's coming: overdue first, else the next reminder (dot + words, not colour alone). */
function PetStatusLine({ status }) {
  if (status.overdue > 0) {
    return <span className="pet-status pet-status-due"><span aria-hidden="true">●</span> {status.overdue} overdue</span>;
  }
  if (status.next) {
    return <span className="pet-status">Next: {status.next.title} · {relativeDay(status.next.due_at)}</span>;
  }
  return <span className="pet-status pet-status-quiet">Nothing scheduled</span>;
}

/** One pet card: species band, avatar, facts and status; tilts toward the mouse. */
function PetCard({ pet, status, onOpen }) {
  const tilt = useTilt();
  return (
    <button type="button" className={`pet-card pet-tone-${pet.species.toLowerCase()}`} onClick={onOpen} {...tilt}>
      <span className="pet-card-band" aria-hidden="true" />
      <PetAvatar pet={pet} />
      <span className="pet-card-text">
        <strong>{pet.name}</strong>
        <span>{[pet.breed || SPECIES[pet.species], petAge(pet.birth_date, pet.birth_date_is_estimate)].join(" · ")}</span>
        <PetStatusLine status={status} />
      </span>
    </button>
  );
}

export default function PetList({ pets, reminders = [], onAdd, onOpen }) {
  if (pets.length === 0) {
    return (
      <div className="pet-empty">
        <h3>Add your first pet</h3>
        <p>Start a profile with their name, birth date and weight. You can add a photo and more details any time.</p>
        <button type="button" className="btn-3d btn-inline" onClick={onAdd}>
          Add a pet
        </button>
      </div>
    );
  }

  return (
    <ul className="pet-grid">
      {pets.map((pet, index) => (
        <li key={pet.id} style={{ "--i": index + 3 }}>
          <PetCard pet={pet} status={petStatus(reminders, pet.id)} onOpen={() => onOpen?.(pet.id)} />
        </li>
      ))}
    </ul>
  );
}
