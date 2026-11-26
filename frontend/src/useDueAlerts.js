// PET-5 (AC3): polls what's due while the dashboard is open, feeds the bell,
// and shows one browser notification per newly due alert (if the user allowed it).
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";
import { ANNOUNCED_KEY, doseAlert, newAlerts, notificationFor, remember, reminderAlert } from "./dueAlerts";
import { DUE_CHANGED } from "./reminders";

const POLL_MS = 60_000;
const supported = typeof window !== "undefined" && "Notification" in window;

function readAnnounced() {
  try {
    return JSON.parse(localStorage.getItem(ANNOUNCED_KEY)) || [];
  } catch {
    return [];
  }
}

/** Everything due now, as alerts: reminders, then medicine doses (US-4 AC3). */
async function fetchDue() {
  const [reminders, doses] = await Promise.all([apiFetch("/reminders/?due=1"), apiFetch("/medications/due-doses/")]);
  return [...reminders.map(reminderAlert), ...doses.map(doseAlert)];
}

export default function useDueAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported");

  const check = useCallback(async () => {
    let due;
    try {
      due = await fetchDue();
    } catch {
      return; // offline or signed out: keep the last count, try again next time
    }
    setAlerts(due);
    // Read fresh each time: another tab may have announced some already.
    const announced = readAnnounced();
    const fresh = newAlerts(due, announced);
    if (fresh.length === 0) return;
    if (supported && Notification.permission === "granted") {
      const { title, body } = notificationFor(fresh);
      new Notification(title, { body, tag: "petpulse-due" });
    }
    // Remembered even without permission, so enabling later doesn't replay old ones.
    localStorage.setItem(ANNOUNCED_KEY, JSON.stringify(remember(announced, fresh)));
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, POLL_MS);
    window.addEventListener(DUE_CHANGED, check);
    return () => {
      clearInterval(timer);
      window.removeEventListener(DUE_CHANGED, check);
    };
  }, [check]);

  async function enableNotifications() {
    if (supported) setPermission(await Notification.requestPermission());
  }

  return { alerts, permission, enableNotifications };
}
