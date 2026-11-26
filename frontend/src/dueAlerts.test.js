// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { doseAlert, newAlerts, notificationFor, remember, reminderAlert } from "./dueAlerts.js";

const rabies = reminderAlert({ id: 7, pet: 3, pet_name: "Milo", kind: "VACCINATION", title: "Rabies booster" });
const flea = reminderAlert({ id: 8, pet: 4, pet_name: "Luna", kind: "TREATMENT", title: "Flea drops" });

test("a reminder becomes an alert with a stable key", () => {
  assert.deepEqual(rabies, { key: "reminder:7", kind: "reminder", pet: 3, title: "Rabies booster", body: "Milo · Vaccination" });
});

test("only alerts not announced before are new", () => {
  assert.deepEqual(newAlerts([rabies, flea], []), [rabies, flea]);
  assert.deepEqual(newAlerts([rabies, flea], ["reminder:7"]), [flea]);
  assert.deepEqual(newAlerts([rabies], ["reminder:7"]), []);
});

test("remembered keys have no duplicates and keep only the latest 200", () => {
  assert.deepEqual(remember(["reminder:7"], [rabies, flea]), ["reminder:7", "reminder:8"]);
  const many = Array.from({ length: 250 }, (_, i) => `reminder:${i}`);
  const fresh = reminderAlert({ id: 999, pet: 3, pet_name: "Milo", kind: "VET_VISIT", title: "Check-up" });
  const kept = remember(many, [fresh]);
  assert.equal(kept.length, 200);
  assert.equal(kept[0], "reminder:51"); // the oldest are dropped
  assert.equal(kept.at(-1), "reminder:999");
});

test("one new alert is announced by name, several as one summary", () => {
  assert.deepEqual(notificationFor([rabies]), { title: "PetPulse: Rabies booster", body: "Milo · Vaccination" });
  assert.deepEqual(notificationFor([rabies, flea]), {
    title: "PetPulse: 2 reminders are due",
    body: "Rabies booster, Flea drops",
  });
});

test("a due dose becomes an alert keyed by medicine, day and time", () => {
  const dose = { medication: 4, pet: 3, pet_name: "Milo", name: "Carprofen", dosage: "1 tablet", date: "2026-11-26", time: "08:00" };
  assert.deepEqual(doseAlert(dose), {
    key: "dose:4:2026-11-26:08:00",
    kind: "dose",
    pet: 3,
    title: "Carprofen at 08:00",
    body: "Milo · 1 tablet",
  });
  // tomorrow's 08:00 dose is a new alert, not one already announced
  assert.notEqual(doseAlert({ ...dose, date: "2026-11-27" }).key, doseAlert(dose).key);
});
