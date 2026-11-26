# Implementation Plan: Reminders and Alerts (PET-5) — V1

Source spec: `spec.md`
Task list: `todo.md`. Jira tracks the story as a whole (PET-5).

## Overview

A new `reminders` app nested under the pet (`/api/pets/<pet_id>/reminders/`) holds one-off or repeating reminders of four kinds, optionally linked to a medicine. The pet page gets a Reminders section; the dashboard gets a Reminders tab (all pets) and a bell that polls for due reminders and shows a browser notification while the app is open. Built as vertical slices: records → mark done + repeat → medicine link → all-pets list → alerts.

## Dependency Graph

```
pets.access.accessible_pets(user)          medications.Medication
  └── Reminder model + ReminderViewSet  ◄────── (optional FK, same pet)
        │   /api/pets/<pet_id>/reminders/
        ├── reminders/recurrence.next_due ── POST …/<id>/done/
        ├── RemindersPanel + ReminderForm on the pet page
        └── /api/reminders/ (all pets, ?due=1)
              ├── RemindersOverview (dashboard tab)
              └── useDueReminders (poll 60 s) ── ReminderBell + browser Notification
```

## Architecture Decisions

- **New app `reminders`.** Same pattern as `medications` / `symptoms`. A reminder is its own record that *may* point at a medicine, rather than a field on each record type, so one list and one bell cover all four kinds, and PET-2/PET-3 only add a nullable FK.
- **Repeat = "create the next one on done"**, not a rule expanded on the fly. Every occurrence is a real row, so edit, delete, done and history work the same for one-off and repeating reminders. Next date is computed from the old `due_at` so a late tick doesn't drift the schedule.
- **`recurrence.py` is a pure function** (`next_due(due_at, repeat)`) with its own tests; no `python-dateutil`.
- **Alerts are pulled, not pushed.** Render's free plan has no worker or cron. The dashboard polls `/api/reminders/?due=1` every 60 s; the bell is a count, and the Notification API shows the alert. Announced IDs go in `localStorage`. Trade-off: no alert while the app is closed (documented out of scope).
- **Cross-pet list is a separate read-only endpoint** (`/api/reminders/`), filtered by `accessible_pets(user)`, so the bell is one request instead of one per pet.
- **Done reminders are locked** (no edit), deletable. Keeps the history honest, and US-18 can build its done-history on it.
- **Frontend stays state-driven**: the Reminders tab is a new `activeTab` value in `OwnerDashboard`; no router.

## Task List

### Phase 1: Reminders on the pet page (AC1, AC2, AC4, AC5 per pet)
- [x] Task 1: `reminders` app: model, CRUD API with `?status=`, migration, tests; registered in settings, urls, CI, CLAUDE.md
- [x] Task 2: `RemindersPanel` + `ReminderForm` on the pet page: list (Open/Done), add, edit, delete dialog

### Checkpoint A
- [x] Backend tests + `makemigrations --check` + `npm run build` pass
- [x] By hand: add, edit, delete a reminder on a pet

### Phase 2: Done, repeat and medicine link (AC6, AC7)
- [x] Task 3: `recurrence.next_due` + `POST …/done/` (next occurrence, locks) + tests; "Mark done" button
- [x] Task 4: medicine link: serializer validation + `medication_name` + tests; "Linked medicine" select in the form

### Checkpoint B
- [x] All tests + build pass
- [x] By hand: yearly vaccination → mark done → next year's appears; medication reminder linked and shown

### Phase 3: All pets and alerts (AC3, AC5 overall)
- [x] Task 5: `GET /api/reminders/` (+ `?due=1`) + tests; Reminders tab (`RemindersOverview`) in desktop nav and mobile bar
- [x] Task 6: `useDueAlerts` hook + `dueAlerts.js` (+ unit test), `ReminderBell` in top bar, "Enable notifications" + browser Notification once per reminder
- [x] Task 7: due medicine doses (US-4 AC3): `medications/due.py` + `GET /api/medications/due-doses/` + tests; counted in the bell, notified, listed under "Doses due"

### Checkpoint C
- [x] All tests + build pass
- [x] By hand: reminder due in 2 minutes → bell count + one notification; reload → no repeat
- [x] By hand: daily dose time 1 minute ahead → bell + notification; mark it given on the pet page → bell clears

### Phase 4: Finish
- [x] Task 8: 390 px + keyboard pass, CLAUDE.md (structure + completed work), todo ticked

### Checkpoint: Complete
- [x] Every Success Criterion in spec.md (1–8) checked
- [ ] Left for the user to commit as `PET-5: …`

## Task Details

### Task 1: Reminder records API
**Acceptance:** CRUD at `/api/pets/<pet_id>/reminders/`; validation (title, kind, due_at, repeat); open list soonest first, `?status=done` works; 404/403/401 rules.
**Verify:** backend tests; `makemigrations --check --dry-run`; `manage.py check`.
**Files:** `backend/reminders/{__init__,apps,models,serializers,views,urls,admin,tests}.py`, `migrations/0001_initial.py`, `petpulse_core/{settings,urls}.py`, `.github/workflows/CICD.yml`, `CLAUDE.md`. **Size:** M (new app; mostly boilerplate following `medications`).

### Task 2: Pet page section
**Acceptance:** Reminders section under Symptoms; add/edit with type, title, date+time, repeat, notes; delete asks first; overdue styled; Open/Done switch.
**Verify:** `npm run build`; by hand on desktop.
**Files:** `RemindersPanel.jsx`, `ReminderForm.jsx`, `PetProfile.jsx`, `styles.css`. **Size:** M.

### Task 3: Mark done + repeat
**Acceptance:** done sets `done_at`/`done_by`; repeating creates next (weekly/monthly/yearly, month-end clamp, time kept); twice → 400; editing done → 400.
**Verify:** recurrence + done tests; build; by hand.
**Files:** `reminders/{recurrence,views,serializers,tests}.py`, `RemindersPanel.jsx`. **Size:** M.
**Depends on:** 1, 2.

### Task 4: Medicine link
**Acceptance:** `medication` accepted only for kind MEDICATION and only the pet's own medicine; response carries `medication_name`; deleting the medicine keeps the reminder.
**Verify:** tests; build; by hand.
**Files:** `reminders/{serializers,tests}.py`, `ReminderForm.jsx`, `RemindersPanel.jsx`. **Size:** S.
**Depends on:** 1, 2.

### Task 5: All-pets list
**Acceptance:** `/api/reminders/` returns only open reminders of the caller's pets, soonest first, with `pet_name`; `?due=1` only due; vets 403; Reminders tab shows Overdue / Upcoming and opens the pet.
**Verify:** tests; build; by hand (desktop + mobile bar).
**Files:** `reminders/{views,urls,tests}.py`, `petpulse_core/urls.py`, `RemindersOverview.jsx`, `OwnerDashboard.jsx`. **Size:** M.
**Depends on:** 1.

### Task 6: Alerts
**Acceptance:** bell shows due count, refreshed every 60 s and after a reminder is marked done; with permission, one browser notification per newly due reminder, not repeated after reload; works (bell only) when permission is denied.
**Verify:** `npm test` (helper `newlyDue(due, announcedIds)`); build; by hand with a reminder 2 minutes ahead.
**Files:** `useDueReminders.js`, `useDueReminders.test.js`, `ReminderBell.jsx`, `OwnerDashboard.jsx`, `styles.css`. **Size:** M.
**Depends on:** 5.

### Task 7: Due medicine doses (US-4 AC3)
**Acceptance:** `/api/medications/due-doses/` lists today's daily doses with `time <= now` and no `DoseLog`, only for active medicines of the caller's pets (vets 403); the bell counts them, notifies once per dose slot, and the Reminders tab lists them under "Doses due" linking to the pet.
**Verify:** medications tests (passed / given / future / ended / not started / as-needed / other owner); `npm test` for the dose key; build; by hand.
**Files:** `medications/{due,views,urls,tests}.py`, `petpulse_core/urls.py`, `useDueReminders.js`, `RemindersOverview.jsx`. **Size:** M.
**Depends on:** 6. **Note:** one query for active medicines + one for today's doses; times filtered in Python (`dose_times` is a JSON list).

### Task 8: Finish
**Acceptance:** usable at 390 px and by keyboard; CLAUDE.md structure + completed work updated; todo ticked.
**Size:** S. **Depends on:** all.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| No alert while the app is closed | Med | Stated out of scope; the bell shows everything overdue the next time the owner opens the app. Email via a scheduled GitHub Action is the natural follow-up |
| Time zones: browser vs server (`Asia/Jerusalem`) | Med | Send `due_at` with offset from the browser (reuse `localDateTime` in `petAge.js`); store aware datetimes; compare with `timezone.now()` |
| Monthly repeat on the 29th–31st | Low | `next_due` clamps to month end; unit tested |
| Polling load | Low | One small query per user per minute; `?due=1` is indexed by `due_at`, only while the dashboard is open |
| Notifications blocked / unsupported (iOS Safari outside PWA) | Low | Bell works regardless; button hidden when `Notification` is missing |
| Duplicate notifications across tabs | Low | Announced IDs shared through `localStorage` |

## Parallelization

Tasks 3–4 can go in either order after 2; Task 5 only needs Task 1. Done in order anyway (one developer, scrum story).

## Open Questions

None. Resolved in spec.md.
