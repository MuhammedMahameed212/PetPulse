// PET-5 (US-5): labels and small helpers shared by the reminder screens.
import { localDateTime } from "./petAge.js";

export const KINDS = {
  MEDICATION: "Medication",
  VACCINATION: "Vaccination",
  TREATMENT: "Treatment",
  VET_VISIT: "Vet visit",
};

export const REPEATS = {
  NONE: "Does not repeat",
  WEEKLY: "Every week",
  MONTHLY: "Every month",
  YEARLY: "Every year",
};

/** The form's default alert time: tomorrow at 09:00, as a datetime-local value. */
export function defaultDueAt(now = new Date()) {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
  return localDateTime(tomorrow);
}

/** Fired after a reminder or a medicine dose changes (added, edited, done, given, deleted), so the bell checks again at once. */
export const DUE_CHANGED = "petpulse:due-changed";
export const announceDueChanged = () => window.dispatchEvent(new Event(DUE_CHANGED));
