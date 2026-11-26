import React from "react";

/** PET-5 (AC3): the top-bar bell with the number of due reminders; opens the Reminders tab. */
export default function ReminderBell({ count, onOpen }) {
  const label = count === 0 ? "Reminders, nothing due" : `Reminders, ${count} due`;
  return (
    <button type="button" className="rem-bell" onClick={onOpen} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.8A1 1 0 0 0 5.2 17.3h13.6a1 1 0 0 0 .9-1.5L18 12.6V9a6 6 0 0 0-6-6Z"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {count > 0 && <span className="rem-bell-count" aria-hidden="true">{count > 9 ? "9+" : count}</span>}
    </button>
  );
}
