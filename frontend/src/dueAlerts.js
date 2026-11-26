// PET-5 (AC3): what the bell shows and the browser announces. Pure functions, tested in dueAlerts.test.js.
import { KINDS } from "./reminders.js";

export const ANNOUNCED_KEY = "petpulse.announcedAlerts";
const MAX_REMEMBERED = 200;

/** A due reminder as an alert: a stable key (so it's announced once), the pet, and its text. */
export const reminderAlert = (r) => ({
  key: `reminder:${r.id}`,
  kind: "reminder",
  pet: r.pet,
  title: r.title,
  body: `${r.pet_name} · ${KINDS[r.kind]}`,
});

/** A due medicine dose (US-4 AC3) as an alert; the key includes the day, so each day's dose is new. */
export const doseAlert = (d) => ({
  key: `dose:${d.medication}:${d.date}:${d.time}`,
  kind: "dose",
  pet: d.pet,
  title: `${d.name} at ${d.time}`,
  body: `${d.pet_name} · ${d.dosage}`,
});

/** The alerts not announced yet. */
export function newAlerts(alerts, announced) {
  const seen = new Set(announced);
  return alerts.filter((a) => !seen.has(a.key));
}

/** The announced keys plus these alerts' keys, keeping only the latest few so storage stays small. */
export function remember(announced, alerts) {
  return [...new Set([...announced, ...alerts.map((a) => a.key)])].slice(-MAX_REMEMBERED);
}

/** One browser notification for one or more new alerts (several at once become one summary). */
export function notificationFor(alerts) {
  if (alerts.length === 1) return { title: `PetPulse: ${alerts[0].title}`, body: alerts[0].body };
  return { title: `PetPulse: ${alerts.length} reminders are due`, body: alerts.map((a) => a.title).join(", ") };
}
