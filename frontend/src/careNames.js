// PET-3: common vaccine and treatment names, offered as suggestions (any name can still be typed).

export const CATEGORY = { VACCINE: "Vaccine", FLEA_TICK: "Flea & tick", DEWORMING: "Deworming", OTHER: "Other" };

const NAMES = {
  DOG: {
    VACCINE: ["Rabies", "DHPP", "Leptospirosis", "Bordetella (kennel cough)"],
    FLEA_TICK: ["NexGard", "Bravecto", "Simparica", "Frontline", "Seresto collar"],
    DEWORMING: ["Drontal", "Milbemax", "Panacur"],
  },
  CAT: {
    VACCINE: ["Rabies", "FVRCP", "FeLV"],
    FLEA_TICK: ["Bravecto", "Frontline", "Revolution"],
    DEWORMING: ["Drontal", "Milbemax", "Profender"],
  },
};

/** Suggested names for a species and category; none for other species or "Other". */
export function careNames(species, category) {
  return NAMES[species]?.[category] ?? [];
}
