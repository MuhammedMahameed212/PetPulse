# Plan: Owner Dashboard and Pet Page Refresh

Source spec: `spec.md` · Task list: `todo.md`

## Approach

Pure helpers first (tested), then the dashboard slice (data → strip → cards), then the pet page slice (hero → jump links → section cards), then motion and a browser pass. Each step builds and leaves the app working.

## Decisions

- **Helpers in `dashboard.js`, not in components**: the date and status rules are the only logic here, so they're pure and unit-tested; components only render.
- **One fetch of `/api/reminders/` for the whole dashboard**: both the strip ("Next up", "Overdue") and every card's status come from the same list; refreshed on `petpulse:due-changed` so marking something done updates the dashboard too.
- **Doses come from the bell hook**: no second poll; alerts gain a `kind` so the strip can count doses.
- **No entrance animations**: frequent screen; press and hover feedback only.
- **No sticky bar**: avoids changing the shared stage's `overflow`.

## Tasks

- [x] 1. `dashboard.js` + tests; `kind` on alerts (+ test)
- [x] 2. Dashboard: greeting, open reminders, `TodaySummary`, richer `PetList` cards
- [x] 3. Pet page: hero, jump links, section cards, coming-soon line
- [x] 4. Motion tokens and press/hover; browser pass (desktop + narrow, keyboard, console); CLAUDE.md

### Checkpoint
- [x] `npm test`, build, backend tests pass; screens checked in the browser
