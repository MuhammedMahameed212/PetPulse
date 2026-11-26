# Todo: Reminders and Alerts (PET-5)

Spec: `spec.md` · Plan: `plan.md`

## Phase 1: Reminders on the pet page
- [x] Create `backend/reminders/` app (apps, models, admin)
- [x] `Reminder` model + migration
- [x] `ReminderSerializer` (title trimmed, choices, `pet_name`, `done_by` name, `is_due`)
- [x] `ReminderViewSet` nested under the pet via `accessible_pets`; `?status=open|done`
- [x] Routes in `reminders/urls.py` + `petpulse_core/urls.py`
- [x] `reminders` in `INSTALLED_APPS`, CI test step, CLAUDE.md commands
- [x] Tests: CRUD, validation, ordering, filter, access (404 / 403 / 401) — 16 tests (83 in total)
- [x] `RemindersPanel.jsx`: Upcoming/Done, cards, overdue style, delete dialog (Edit hidden on done ones)
- [x] `ReminderForm.jsx`: add / edit (default tomorrow 09:00; labels + default in `src/reminders.js`, tested in `reminders.test.js`)
- [x] `PetProfile.jsx`: Reminders section below Symptoms
- [x] Checkpoint A: backend tests ✓ (83), `makemigrations --check` ✓, `npm test` ✓ (9), build ✓; add / edit / delete checked in Chrome (2026-11-26)

## Phase 2: Done, repeat, medicine link
- [x] `reminders/recurrence.py`: `next_due(due_at, repeat)` + tests (weekly, monthly clamp, yearly Feb 29, time kept, clock change) — 6 tests
- [x] `POST …/<id>/done/` → `{done, next}`; done twice → 400; edit done → 400; row lock (`select_for_update(of=("self",))`) against double clicks — 6 tests (95 in total)
- [x] "Mark done" button; next occurrence appears in the list; status line says when the next one is
- [x] Mark done only from the due day (`can_mark_done`, 400 before) so repeated clicks stop after one — 3 tests (98 in total)
- [x] Medicine link: only kind MEDICATION, only the pet's own medicine (another pet's answers like a missing id); `medication_name`; SET_NULL on delete; next repeat keeps the link — 7 tests (105 in total)
- [x] "Linked medicine" select in the form (only for type Medication); name on the card
- [x] Checkpoint B: tests ✓ (105), `makemigrations --check` ✓, `npm test` ✓ (9), build ✓; in Chrome: yearly vaccination → Mark done → next year's at the same time, without a Mark done button; medication reminder linked and shown

## Phase 3: All pets and alerts
- [x] `GET /api/reminders/` (+ `?due=1`), read-only, through `accessible_pets`; `AllRemindersView` — 4 tests (109 in total)
- [x] `RemindersOverview.jsx` (Overdue / Upcoming, row opens the pet) + Reminders tab (side nav + mobile bar)
- [x] `useDueAlerts.js` (poll 60 s, check again on `petpulse:reminders-changed`) + pure `dueAlerts.js` tested in `dueAlerts.test.js` (4 tests, 13 in total)
- [x] `ReminderBell.jsx` in the top bar; "Enable notifications" in the Reminders tab (or why it can't); one notification per reminder (several at once → one summary), keys in `localStorage`
- [x] `medications/due.py`: `due_doses(user, now)` (2 queries) + `GET /api/medications/due-doses/` (`DueDosesView`); tests (passed, given, yesterday's given, future, ended, not started, last day, as-needed, other owner, vet 403, 401) — 7 tests (116 in total)
- [x] Bell counts due doses; notification key `dose:<medication>:<date>:<time>` (tested); "Doses due" list in the Reminders tab → pet page; marking a dose given fires `petpulse:due-changed` so the bell clears at once
- [x] Checkpoint C: backend tests ✓ (116), `npm test` ✓ (14), build ✓; in Chrome: dose came due at its time → bell 1 + one notification; overdue reminder → one notification, none on the next check or after a reload; dose marked given → bell cleared at once

## Phase 4: Finish
- [x] Narrow-screen and keyboard pass: checked in Chrome at 500 px (Chrome's minimum window width; the CSS breakpoints for 390 px are the same ones, at 640 and 520 px): no sideways scroll, cards stack, buttons wrap, 3 bottom tabs + bell fit; focus goes to the Type field when the form opens and to the Reminders heading after mark done / delete / save / cancel; no console errors
- [x] Fixed during the browser pass: the "Done. Next one…" message stayed after other actions (now cleared when the form or delete dialog opens); opening the form lost keyboard focus (now on Type)
- [x] CLAUDE.md: repository structure + completed work
- [x] All success criteria checked (see Verification below); left uncommitted for `PET-5: …`

## Verification (2026-11-26)

Browser run: Chrome, built app served by Django on a throwaway SQLite database, test owner with one dog and one daily medicine.
The browser's real permission prompt wasn't clicked; `window.Notification` was replaced in the page by a stub reporting "granted" that records each notification, so the hook's own code path ran.

| Success criterion (spec.md) | Result |
|---|---|
| 1. Add a vaccination reminder; it shows on the pet and in the Reminders tab | ✓ |
| 2. Medication reminder linked to the pet's medicine; another pet's refused | ✓ in Chrome; refusal by test `test_ac6_another_pets_medicine_is_refused_like_a_missing_one` |
| 3. Bell count + one notification when due, not repeated after reload; due dose too, cleared when given | ✓ |
| 4. Edit changes it; delete asks first | ✓ |
| 5. Mark done → Done; yearly creates next year's at the same time | ✓ (plus: future ones can't be ticked) |
| 6. Soonest first, overdue marked | ✓ |
| 7. Other owners 404, vets 403, signed out 401 | ✓ by tests |
| 8. Tests (incl. `reminders` in CI), build, migration | ✓ 116 backend, 14 frontend, build, `makemigrations --check` clean |

Not verified: the row lock in `mark_done` on PostgreSQL (CI and local use SQLite). Mark one reminder done on Render after deploying.
