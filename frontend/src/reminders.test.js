// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultDueAt } from "./reminders.js";

test("default alert time is tomorrow at 09:00", () => {
  assert.equal(defaultDueAt(new Date(2026, 10, 26, 22, 15)), "2026-11-27T09:00");
});

test("default alert time rolls over the month and year", () => {
  assert.equal(defaultDueAt(new Date(2026, 10, 30, 8, 0)), "2026-12-01T09:00");
  assert.equal(defaultDueAt(new Date(2026, 11, 31, 8, 0)), "2027-01-01T09:00");
});
