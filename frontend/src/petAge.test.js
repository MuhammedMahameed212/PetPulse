// Run with: npm test (Node's built-in test runner, no dependencies).
import assert from "node:assert/strict";
import { test } from "node:test";
import { petAge } from "./petAge.js";

const today = new Date(2026, 10, 17); // 17 Nov 2026, local time

test("years and months", () => {
  assert.equal(petAge("2024-07-02", false, today), "2 yrs 4 mos");
  assert.equal(petAge("2025-10-17", false, today), "1 yr 1 mo");
  assert.equal(petAge("2026-03-20", false, today), "7 mos");
});

test("birthday boundary: the day before does not count as a full year", () => {
  assert.equal(petAge("2024-11-17", false, today), "2 yrs");
  assert.equal(petAge("2024-11-18", false, today), "1 yr 11 mos");
});

test("leap-day birthday in a non-leap year", () => {
  assert.equal(petAge("2024-02-29", false, new Date(2026, 1, 28)), "1 yr 11 mos");
});

test("under a month", () => {
  assert.equal(petAge("2026-11-01", false, today), "Under a month");
  assert.equal(petAge("2026-11-01", true, today), "About a month");
});

test("approximate dates round to years or months", () => {
  assert.equal(petAge("2023-01-01", true, today), "About 3 yrs");
  assert.equal(petAge("2026-05-01", true, today), "About 6 mos");
});
