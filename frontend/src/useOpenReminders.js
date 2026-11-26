// Owner dashboard: the open reminders of every pet (GET /api/reminders/), for the Today strip and the pet cards.
import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { DUE_CHANGED } from "./reminders";

/** Loads open reminders, and again when something changes (`petpulse:due-changed`) or `refreshKey` changes
 *  (the dashboard passes the bell's count, so a reminder turning overdue moves without a second poll). */
export default function useOpenReminders(refreshKey) {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      apiFetch("/reminders/")
        .then((data) => !cancelled && setReminders(data))
        .catch(() => {}); // the strip and cards just show less; the Reminders tab reports errors
    load();
    window.addEventListener(DUE_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(DUE_CHANGED, load);
    };
  }, [refreshKey]);

  return reminders;
}
