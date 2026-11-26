import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { showDateTime } from "../petAge";
import { KINDS, REPEATS } from "../reminders";

/** One reminder in the all-pets list; the whole row opens the pet's page. */
function ReminderRow({ reminder: r, onOpenPet }) {
  return (
    <li>
      <button type="button" className={r.is_due ? "med-card rem-row rem-due" : "med-card rem-row"} onClick={() => onOpenPet(r.pet)}>
        <span className="med-card-main">
          <span className="sym-tags">
            <span className="sym-badge rem-kind">{KINDS[r.kind]}</span>
            <span className="sym-status">{r.pet_name}</span>
          </span>
          <strong>{r.title}</strong>
          <span>
            <time dateTime={r.due_at}>{showDateTime(r.due_at)}</time>
            {r.repeat !== "NONE" && ` · ${REPEATS[r.repeat]}`}
          </span>
          {r.medication_name && <small>Linked to {r.medication_name}</small>}
        </span>
      </button>
    </li>
  );
}

/** AC3: lets the owner turn on browser notifications, or says why they can't. */
function NotificationSetting({ permission, enableNotifications }) {
  if (permission === "granted") return <p className="field-hint">Browser notifications are on while PetPulse is open.</p>;
  if (permission === "denied") return <p className="field-hint">Notifications are blocked for this site. Allow them in your browser’s site settings.</p>;
  if (permission === "unsupported") return <p className="field-hint">This browser can’t show notifications. The bell still counts what’s due.</p>;
  return (
    <button type="button" className="btn-line btn-small" onClick={enableNotifications}>
      Enable notifications
    </button>
  );
}

/** PET-5 (AC5): the Reminders tab — open reminders of every pet, overdue first, then upcoming. */
export default function RemindersOverview({ onOpenPet, notifications }) {
  const [reminders, setReminders] = useState(null); // null while loading
  const [doses, setDoses] = useState([]); // US-4 AC3: today's doses that are due and not given
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    Promise.all([apiFetch("/reminders/"), apiFetch("/medications/due-doses/")])
      .then(([open, due]) => {
        setReminders(open);
        setDoses(due);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  const overdue = (reminders || []).filter((r) => r.is_due);
  const upcoming = (reminders || []).filter((r) => !r.is_due);
  const group = (title, items) => items.length > 0 && (
    <>
      <h3 className="pet-records-title">{title}</h3>
      <ul className="med-list">
        {items.map((r) => <ReminderRow key={r.id} reminder={r} onOpenPet={onOpenPet} />)}
      </ul>
    </>
  );

  return (
    <div className="layer-3-card">
      <h2 className="welcome-heading">Reminders</h2>
      <p className="welcome-body">Everything coming up for your pets. Open one to mark it done or change it.</p>
      <NotificationSetting {...notifications} />
      {loadError && <div className="error-alert" role="alert">Couldn't load your reminders: {loadError}</div>}
      {reminders === null && !loadError && <p className="welcome-body">Loading your reminders…</p>}
      {doses.length > 0 && (
        <>
          <h3 className="pet-records-title">Doses due</h3>
          <ul className="med-list">
            {doses.map((d) => (
              <li key={`${d.medication}-${d.time}`}>
                <button type="button" className="med-card rem-row rem-due" onClick={() => onOpenPet(d.pet)}>
                  <span className="med-card-main">
                    <span className="sym-tags">
                      <span className="sym-badge rem-kind">Medication dose</span>
                      <span className="sym-status">{d.pet_name}</span>
                    </span>
                    <strong>{d.name} at {d.time}</strong>
                    <span>{d.dosage} · open {d.pet_name}’s page to mark it given</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {reminders?.length === 0 && doses.length === 0 && (
        <p className="med-empty">No upcoming reminders. Add one from a pet’s page, under Reminders.</p>
      )}
      {group("Overdue", overdue)}
      {group("Upcoming", upcoming)}
    </div>
  );
}
