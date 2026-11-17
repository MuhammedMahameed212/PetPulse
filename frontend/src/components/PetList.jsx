import React from "react";
import { petAge } from "../petAge";

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

export default function PetList({ pets, onAdd, onOpen }) {
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
      {pets.map((pet) => (
        <li key={pet.id}>
          <button type="button" className="pet-card" onClick={() => onOpen?.(pet.id)}>
            <PetAvatar pet={pet} />
            <span className="pet-card-text">
              <strong>{pet.name}</strong>
              <span>{[SPECIES[pet.species], pet.breed].filter(Boolean).join(", ")}</span>
              <span>{petAge(pet.birth_date, pet.birth_date_is_estimate)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
