// 3D touches for the owner screens: the pet card tilt and each pet's collar tag. Pure, tested in fx3d.test.js.

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/** Card tilt for a pointer at (x, y) over `rect`: rotateX/rotateY in degrees (up to `max`),
 *  and the glare position in % so the light follows the pointer. */
export function tiltAt(rect, x, y, max) {
  const px = clamp01((x - rect.left) / rect.width);
  const py = clamp01((y - rect.top) / rect.height);
  return { rx: (0.5 - py) * 2 * max, ry: (px - 0.5) * 2 * max, gx: px * 100, gy: py * 100 };
}

// Same hues as the .pet-tone-* species tones in styles.css.
const ENAMEL = { DOG: 0x2c45f5, CAT: 0xb4325c, BIRD: 0xa86406, RABBIT: 0x1e8c5e };

/** What CollarTag3D engraves for a real pet: bone tag for dogs, round for the rest, species colour, an ID. */
export function petTag(pet) {
  return {
    name: pet.name,
    tagShape: pet.species === "DOG" ? "bone" : "round",
    enamel: ENAMEL[pet.species] ?? 0x4b5f59,
    tagLine: `ID PP-${String(pet.id).padStart(4, "0")}`,
  };
}
