import { test } from "node:test";
import assert from "node:assert/strict";
import { careNames } from "./careNames.js";

test("suggests names for the pet's species and the chosen category", () => {
  assert.ok(careNames("DOG", "VACCINE").includes("DHPP"));
  assert.ok(careNames("CAT", "VACCINE").includes("FVRCP"));
  assert.ok(!careNames("CAT", "VACCINE").includes("DHPP"));
});

test("suggests nothing for other species or the Other category", () => {
  assert.deepEqual(careNames("BIRD", "VACCINE"), []);
  assert.deepEqual(careNames("DOG", "OTHER"), []);
});
