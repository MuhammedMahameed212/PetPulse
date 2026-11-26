import React from "react";
import { nextUp, relativeDay } from "../dashboard";

/** One count tile: a big number, or "All clear" in green when it's zero. */
function CountTile({ count, label, clearLabel, onOpen, index }) {
  const clear = count === 0;
  return (
    <button type="button" className={clear ? "today-tile today-clear" : "today-tile today-alert"} onClick={onOpen}
      style={{ "--i": index }}>
      <span className="today-value">{clear ? "All clear" : count}</span>
      <span className="today-label">{clear ? clearLabel : label}</span>
    </button>
  );
}

/** The dashboard's Today strip: doses due, overdue reminders, and what's next. */
export default function TodaySummary({ doseCount, reminders, onOpenReminders, onOpenPet }) {
  const overdue = reminders.filter((r) => r.is_due).length;
  const next = nextUp(reminders);

  return (
    <section className="today-strip" aria-label="Today">
      <CountTile count={doseCount} label={doseCount === 1 ? "dose due now" : "doses due now"}
        clearLabel="no doses due" onOpen={onOpenReminders} index={0} />
      <CountTile count={overdue} label={overdue === 1 ? "overdue reminder" : "overdue reminders"}
        clearLabel="nothing overdue" onOpen={onOpenReminders} index={1} />
      {next ? (
        <button type="button" className="today-tile today-next" onClick={() => onOpenPet(next.pet)} style={{ "--i": 2 }}>
          <span className="today-label">Next up</span>
          <span className="today-title">{next.title}</span>
          <span className="today-label">{next.pet_name} · {relativeDay(next.due_at)}</span>
        </button>
      ) : (
        <div className="today-tile today-next" style={{ "--i": 2 }}>
          <span className="today-label">Next up</span>
          <span className="today-title">Nothing scheduled</span>
          <span className="today-label">Add reminders from a pet’s page</span>
        </div>
      )}
    </section>
  );
}
