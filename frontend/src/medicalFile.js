// PET-2: helpers for the medical file timeline (events come from /api/pets/<id>/medical-file/, newest first).

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-22" → "November 2026". */
export function monthLabel(isoDate) {
  const [year, month] = isoDate.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** Groups events (already in order) by month, keeping the order: [{ month: "2026-11", label, events }]. */
export function groupByMonth(events) {
  const groups = [];
  for (const item of events) {
    const month = item.date.slice(0, 7);
    if (groups.at(-1)?.month !== month) groups.push({ month, label: monthLabel(item.date), events: [] });
    groups.at(-1).events.push(item);
  }
  return groups;
}
