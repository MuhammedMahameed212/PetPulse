# Todo: Owner Dashboard and Pet Page Refresh

Spec: `spec.md` · Plan: `plan.md`

- [x] `dashboard.js`: greeting, relativeDay, petStatus, nextUp + `dashboard.test.js`
- [x] `dueAlerts.js`: `kind` on reminder and dose alerts (+ test)
- [x] OwnerDashboard: greeting by time of day; load open reminders, refresh on `petpulse:due-changed`
- [x] `TodaySummary.jsx`: Doses due / Overdue / Next up tiles
- [x] `PetList.jsx`: species band, larger avatar, status line
- [x] `PetProfile.jsx`: hero with one fact line, jump links, coming-soon line
- [x] Section cards for Medications / Symptoms / Reminders
- [x] Motion: ease tokens, press scale, hover lift (pointer devices only)
- [x] Browser pass: desktop + narrow, keyboard, no console errors
- [x] CLAUDE.md: new files
- [x] 3D V1.2: `fx3d.js` (tiltAt, petTag) + `fx3d.test.js`; `useTilt.js`; `PetCard` in PetList; collar tag in the pet hero
- [x] Motion V1.1: view entrance, stagger, avatar settle, overdue ring, bell pop, jump flash, avatar hover, reduced-motion fade

## Verification (2026-11-26)

| Check | Result |
| --- | --- |
| `npm test` | 19/19 pass (5 new in `dashboard.test.js`, `kind` asserted in `dueAlerts.test.js`) |
| `npm run build` | clean |
| Backend tests | 116/116 pass (no backend changes) |
| Desktop 1280 px | strip shows 2 doses / 1 overdue / next "Rabies booster · Milo · in 4 days"; bell 3 = 2 + 1 |
| Mobile 390 px | no sideways scroll; strip wraps to 2 + 1; hero stacks |
| Keyboard | tab order: back, Edit, Delete, jump links, then each section's actions |
| Jump links | heading lands 1.5rem below the top (scroll-margin); smooth only without reduced motion |
| Console | no errors (headless Chrome via DevTools protocol, seeded throwaway DB) |
| Motion V1.1 (Chrome) | stagger measured via `getAnimations()`: tiles +60/100/140 ms, cards +180/220/260 ms; jump flash opacity 1.00 until ~0.9 s, 0 by 2 s; hover lift seen; no console errors |
| 3D V1.2 (Chrome) | card tilt + glare on hover; Milo bone tag / Luna round tag engraved with name + ID, drag spins; 500 px: tag below details, no sideways scroll; no console errors; three.js stays a lazy chunk (main bundle +2 kB) |
