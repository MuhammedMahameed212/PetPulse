// Owner dashboard: the small rules behind the greeting, the Today strip and the pet cards.
// Pure functions, tested in dashboard.test.js.

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Good morning" before noon, "Good afternoon" until 18:00, else "Good evening" (also late night). */
export function greeting(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Whole calendar days from `now` to the moment, in local time ("tomorrow" at 01:00 is still tomorrow). */
function daysBetween(now, moment) {
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((start(moment) - start(now)) / DAY_MS);
}

/** An ISO time as words: "today", "tomorrow", "in 4 days", "yesterday", "6 days ago". */
export function relativeDay(iso, now = new Date()) {
  const days = daysBetween(now, new Date(iso));
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** One pet's line on its card, from the open reminders (soonest first): how many are overdue, and the next one. */
export function petStatus(reminders, petId) {
  const mine = reminders.filter((r) => r.pet === petId);
  return { overdue: mine.filter((r) => r.is_due).length, next: nextUp(mine) };
}

/** The soonest open reminder whose time hasn't come yet, or null. */
export function nextUp(reminders) {
  return reminders.find((r) => !r.is_due) ?? null;
}
