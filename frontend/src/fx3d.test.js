// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { petTag, tiltAt } from "./fx3d.js";

const card = { left: 100, top: 50, width: 200, height: 100 };

test("tiltAt is flat at the centre and leans toward the pointer at the edges", () => {
  assert.deepEqual(tiltAt(card, 200, 100, 6), { rx: 0, ry: 0, gx: 50, gy: 50 });
  assert.deepEqual(tiltAt(card, 300, 50, 6), { rx: 6, ry: 6, gx: 100, gy: 0 }); // top-right: top comes forward, right side back
  assert.deepEqual(tiltAt(card, 100, 150, 6), { rx: -6, ry: -6, gx: 0, gy: 100 });
});

test("tiltAt clamps a pointer just outside the card", () => {
  assert.deepEqual(tiltAt(card, 320, 40, 6), { rx: 6, ry: 6, gx: 100, gy: 0 });
});

test("petTag: dogs get a bone tag, others a round one, in the species colour, with a stable ID", () => {
  assert.deepEqual(petTag({ id: 7, name: "Milo", species: "DOG" }),
    { name: "Milo", tagShape: "bone", enamel: 0x2c45f5, tagLine: "ID PP-0007" });
  assert.equal(petTag({ id: 2, name: "Luna", species: "CAT" }).tagShape, "round");
  assert.equal(petTag({ id: 2, name: "Luna", species: "CAT" }).enamel, 0xb4325c);
  assert.equal(petTag({ id: 3, name: "Pip", species: "LIZARD" }).enamel, 0x4b5f59); // unknown → ink
});
