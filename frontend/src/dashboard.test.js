// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { greeting, nextUp, petStatus, relativeDay } from "./dashboard.js";

test("greeting follows the time of day", () => {
  assert.equal(greeting(5), "Good morning");
  assert.equal(greeting(11), "Good morning");
  assert.equal(greeting(12), "Good afternoon");
  assert.equal(greeting(17), "Good afternoon");
  assert.equal(greeting(18), "Good evening");
  assert.equal(greeting(2), "Good evening");
});

const now = new Date(2026, 10, 26, 21, 30); // 26 Nov 2026, 21:30 local

test("relativeDay counts calendar days, not 24-hour blocks", () => {
  assert.equal(relativeDay(new Date(2026, 10, 26, 8, 0).toISOString(), now), "today");
  assert.equal(relativeDay(new Date(2026, 10, 27, 1, 0).toISOString(), now), "tomorrow"); // under 4 hours away
  assert.equal(relativeDay(new Date(2026, 10, 30, 9, 0).toISOString(), now), "in 4 days");
  assert.equal(relativeDay(new Date(2026, 10, 25, 23, 0).toISOString(), now), "yesterday");
  assert.equal(relativeDay(new Date(2026, 10, 20, 9, 0).toISOString(), now), "6 days ago");
});

test("relativeDay crosses the month end", () => {
  assert.equal(relativeDay(new Date(2026, 11, 8, 9, 0).toISOString(), now), "in 12 days");
});

const reminders = [ // as /api/reminders/ returns them: open, soonest first
  { id: 1, pet: 1, title: "Check-up", is_due: true },
  { id: 2, pet: 1, title: "Rabies booster", is_due: false },
  { id: 3, pet: 2, title: "Flea drops", is_due: false },
  { id: 4, pet: 2, title: "Worming", is_due: false },
];

test("petStatus gives the pet's overdue count and its next upcoming reminder", () => {
  assert.deepEqual(petStatus(reminders, 1), { overdue: 1, next: reminders[1] });
  assert.deepEqual(petStatus(reminders, 2), { overdue: 0, next: reminders[2] });
  assert.deepEqual(petStatus(reminders, 3), { overdue: 0, next: null });
});

test("nextUp is the soonest reminder that isn't overdue yet", () => {
  assert.equal(nextUp(reminders), reminders[1]);
  assert.equal(nextUp([reminders[0]]), null);
  assert.equal(nextUp([]), null);
});
