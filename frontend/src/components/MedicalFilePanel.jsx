import React, { useState } from "react";
import { apiFetch } from "../api";
import { groupByMonth } from "../medicalFile";
import { showDate } from "../petAge";
import RecordSection from "./RecordSection";

const TYPES = {
  VACCINE: ["Vaccine", "file-vaccine"],
  TREATMENT: ["Treatment", "file-treatment"],
  MEDICATION: ["Medication", "file-medication"],
  SYMPTOM: ["Symptom", "file-symptom"],
};

const FILTERS = [
  ["", "All"],
  ["VACCINE", "Vaccines"],
  ["TREATMENT", "Treatments"],
  ["MEDICATION", "Medications"],
  ["SYMPTOM", "Symptoms"],
];

const WHAT = { GIVEN: "Given", STARTED: "Started", ENDED: "Ended", NOTED: "Noted" };

/** PET-2 (US-2): the pet's medical file — every medical event on one timeline, by month, filterable by type. */
export default function MedicalFilePanel({ pet }) {
  const [events, setEvents] = useState(null); // null until first opened
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  // Reloaded each time the file opens, so changes made in the other sections show up.
  function load() {
    apiFetch(`/pets/${pet.id}/medical-file/`)
      .then((data) => {
        setEvents(data);
        setError("");
      })
      .catch((err) => setError(err.message));
  }

  const shown = (events ?? []).filter((e) => !filter || e.type === filter);
  const months = groupByMonth(shown);

  return (
    <RecordSection id="file" title="Medical file" onOpen={load}>
      {error && <div className="error-alert" role="alert">{error}</div>}

      <div className="sym-filter" role="group" aria-label="Show in the medical file">
        {FILTERS.map(([value, label]) => (
          <button key={label} type="button" className="btn-line btn-small" aria-pressed={filter === value}
            onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>

      {events && shown.length === 0 && (
        <p className="med-empty">
          {filter
            ? `No ${FILTERS.find(([value]) => value === filter)[1].toLowerCase()} in ${pet.name}’s file.`
            : `Nothing in ${pet.name}’s medical file yet. Add a vaccination, medicine or symptom below.`}
        </p>
      )}

      {months.map((month) => (
        <section key={month.month} className="file-month" aria-label={month.label}>
          <h4 className="care-subtitle">{month.label}</h4>
          <ul className="file-list">
            {month.events.map((item) => {
              const [typeLabel, tone] = TYPES[item.type];
              return (
                <li key={item.id}>
                  <a className="file-event" href={`#${item.section}-section`}>
                    <time className="file-date" dateTime={item.date}>
                      {showDate(item.date)}
                      {item.time && ` ${item.time}`}
                    </time>
                    <span className="file-main">
                      <span className="sym-tags">
                        <span className={`sym-badge ${tone}`}>{typeLabel}</span>
                        <span className="sym-status">{WHAT[item.event]}</span>
                      </span>
                      <strong>{item.title}</strong>
                      {item.detail && <small>{item.detail}</small>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </RecordSection>
  );
}
