import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByMonth, monthLabel } from "./medicalFile.js";

test("month label in words", () => {
  assert.equal(monthLabel("2026-11-22"), "November 2026");
  assert.equal(monthLabel("2025-01-01"), "January 2025");
});

test("groups events by month and keeps their order", () => {
  const events = [
    { id: "a", date: "2026-11-22" },
    { id: "b", date: "2026-11-01" },
    { id: "c", date: "2026-09-30" },
    { id: "d", date: "2025-09-15" }, // same month name, other year: its own group
  ];
  const groups = groupByMonth(events);
  assert.deepEqual(groups.map((g) => g.label), ["November 2026", "September 2026", "September 2025"]);
  assert.deepEqual(groups[0].events.map((e) => e.id), ["a", "b"]);
});

test("no events, no groups", () => {
  assert.deepEqual(groupByMonth([]), []);
});
