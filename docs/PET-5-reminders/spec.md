# Spec: Reminders and Alerts (PET-5) — V1

Status: approved (2026-11-26)
Jira: PET-5 (US-5), Milestone 2 (PET-25). Requirement: FR06 in `docs/פרוייקט גמר.docx`.
Depends on: PET-1 (Pet model, pet page), PET-4 (`Medication`, `accessible_pets`, nested-app pattern).

## Objective

Owners set reminders for a pet's medicines, vaccinations, treatments and vet visits, see what is coming up, get an alert when one is due, and mark it done, so they don't miss important dates for their pet's health.

User story (US-5): As a pet owner, I want to get reminders and alerts about medicines, vaccinations, treatments and planned visits, so I don't forget important dates related to my pet's health.

| AC | Acceptance criterion | How V1 meets it |
|----|---------------------|-----------------|
| AC1 | Set reminders for medicines, vaccinations, treatments and vet visits | "Add reminder" on the pet's Reminders section; type = Medication / Vaccination / Treatment / Vet visit |
| AC2 | Each reminder has at least a type, date and time | Type, title, **date and time** (`due_at`); optional notes, **repeat** (none / weekly / monthly / yearly) |
| AC3 | The system shows or sends an alert at the set time | **In-app:** a bell in the top bar counts due reminders across all pets. **Browser notification** while PetPulse is open (the page checks every minute). No email or push in V1 |
| AC4 | Edit or delete an existing reminder | Edit form, and delete with confirmation |
| AC5 | View the list of upcoming reminders | Per pet (pet page) and across all pets (new "Reminders" tab), soonest first, overdue ones on top |
| AC6 | Medicine or treatment reminders can link to the record in the medical file | A Medication reminder can link to one of **that pet's medicines** (PET-4). Treatments and vaccinations get the same kind of link when their records are built (PET-2 / PET-3) |
| AC7 | After the treatment or medicine is given, mark the event as done | "Mark done". A repeating reminder then creates the next one automatically |
| (US-4 AC3) | Receive reminders at the medicine dose times (left open by PET-4) | Today's daily doses whose time has passed and aren't marked given count in the bell, notify like reminders, and list under "Doses due" in the Reminders tab |

**Related requirements in the project document.** FR04 ("link a vaccination or treatment to a future date to create a reminder") and US-3 AC6 are met by PET-3 adding a nullable FK to `Reminder` and a "Create reminder" button: this model is built for that. FR05 ("link a medicine to its reminders") is AC6 here. US-18 / FR17 (tracking treatments done, with a note and history) builds on `done_at` / `done_by` from this story.

## Data Model

New app `backend/reminders/`.

**Reminder**

| Field | Type | Rules |
|-------|------|-------|
| `pet` | FK → `pets.Pet`, CASCADE, `related_name="reminders"` | from the URL, never from the body |
| `kind` | Char choices `MEDICATION` / `VACCINATION` / `TREATMENT` / `VET_VISIT` | required |
| `title` | Char(100) | required, trimmed; e.g. "Rabies booster", "Check-up at Dr. Cohen" |
| `due_at` | DateTime | required; may be in the past (owner records something overdue) |
| `repeat` | Char choices `NONE` / `WEEKLY` / `MONTHLY` / `YEARLY` | default `NONE` |
| `medication` | FK → `medications.Medication`, SET_NULL, nullable | only when `kind = MEDICATION`; must belong to the same pet |
| `notes` | Char(300), blank | |
| `done_at` | DateTime, nullable | set by "Mark done"; null = still open |
| `done_by` | FK → User, SET_NULL, nullable | the caller who marked it |
| `created_by` | FK → User, SET_NULL, nullable | the caller |
| `created_at`, `updated_at` | DateTime | automatic |

Ordering: open reminders by `due_at` ascending (soonest first); the Done list by `done_at`, latest first.

**Repeat rule.** Marking a repeating reminder done creates a new open reminder with the same fields and `due_at` moved on by one step **from the old `due_at`** (not from when it was marked), keeping the time of day. Monthly on the 31st falls back to the last day of a shorter month (Jan 31 → Feb 28). Leap day yearly → Feb 28. Plain `datetime` + `calendar`, no new dependency.

**Deleting a linked medicine** keeps the reminder, with no link (SET_NULL).

## API

All endpoints need a signed-in pet owner. A pet the caller can't access answers 404, vets get 403 (until PET-21), signed-out users 401.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/pets/<pet_id>/reminders/` | the pet's reminders; `?status=open` (default) or `done` |
| POST | `/api/pets/<pet_id>/reminders/` | add (201) |
| GET / PATCH / DELETE | `/api/pets/<pet_id>/reminders/<id>/` | view, edit, delete |
| POST | `/api/pets/<pet_id>/reminders/<id>/done/` | mark done (200); returns `{ "done": {...}, "next": {...} \| null }` |
| GET | `/api/reminders/` | open reminders across **all** the caller's pets, soonest first; `?due=1` only those due now (`due_at <= now`) — used by the bell |

| GET | `/api/medications/due-doses/` | today's doses across all the caller's pets that are due (`time <= now`) and not given: `[{ "medication": 4, "pet": 3, "pet_name": "Milo", "name": "Carprofen", "dosage": "1 tablet", "time": "08:00" }]` |

`/api/reminders/` and `/api/medications/due-doses/` are read-only and go through `accessible_pets`, so they follow the same access rule. The due-doses logic lives in the `medications` app (`medications/due.py`), because doses belong to medicines; reminders don't depend on it.

Rules:
- `medication` given with a kind other than `MEDICATION` → 400. A medicine of another pet → 400.
- Marking a done reminder done again → 400.
- A reminder can be marked done **from its due day** (Israel time), not before → 400. This stops repeated clicks from ticking the next reminders each tick creates. If a treatment was given early, edit the date first. The response has `can_mark_done` so the screen shows the button only when allowed.
- A done reminder can still be deleted; it can't be edited (400), so history stays honest.

Reminder response:

```json
{
  "id": 7, "pet": 3, "pet_name": "Milo",
  "kind": "VACCINATION", "title": "Rabies booster",
  "due_at": "2026-12-01T09:00:00+02:00", "repeat": "YEARLY",
  "medication": null, "medication_name": null,
  "notes": "Bring the vaccine booklet",
  "is_due": false, "can_mark_done": false, "done_at": null, "done_by": null,
  "created_at": "...", "updated_at": "..."
}
```

`done_by` is the user's first name, or the username when empty (same as PET-4/PET-6). `is_due` = open and `due_at <= now`.

## Frontend

- **Reminders section on the pet page (`RemindersPanel`)**, below Symptoms: Open / Done switch; each card shows type badge, title, date and time, repeat, linked medicine, notes; "Overdue" style when `is_due`; buttons Mark done, Edit, Delete (confirmation `<dialog>`, as for medicines).
- **Form (`ReminderForm`)**: type, title, date and time (default: tomorrow 09:00), repeat, notes; a "Linked medicine" select appears only for type Medication and lists the pet's medicines. Linked labels; works at 390 px.
- **Reminders tab in `OwnerDashboard`** (desktop side nav + mobile bottom bar): open reminders across all pets (`RemindersOverview`), grouped Overdue / Upcoming, each showing the pet's name; click opens that pet's page.
- **Bell (`ReminderBell`)** in the top bar next to the profile menu: count of due reminders; clicking opens the Reminders tab.
- **Polling hook (`useDueAlerts`)**, with the pure parts (alert keys, "what's new", the notification text) in `dueAlerts.js`: fetches `/api/reminders/?due=1` and `/api/medications/due-doses/` on load and every 60 s while the dashboard is open; the bell counts both. When a reminder or dose becomes due that hasn't been announced yet, it shows a browser `Notification` (only if the user allowed it via an "Enable notifications" button; announced keys, `reminder:<id>` and `dose:<medication>:<date>:<time>`, are kept in `localStorage` so a reload doesn't repeat them).
- Several alerts that become due at once (e.g. after signing in) show as **one** summary notification. Alerts are remembered as announced even without permission, so turning notifications on later doesn't replay old ones.
- After a reminder is added, edited, done or deleted, or a dose is marked given or undone in Medications, the screen fires a `petpulse:due-changed` browser event and the bell checks at once instead of waiting up to a minute.
- **"Doses due" in the Reminders tab**: each due dose shows pet, medicine, dosage and time; clicking opens the pet page, where the dose is marked given in the Medications section (PET-4). After that it drops out of the bell on the next check.

## Tech Stack

Unchanged: Django 5.2 + DRF 3.18, React 18 + Vite 6. No new dependencies. Browser Notification API (built in).

## Commands

```
Backend tests: .venv/bin/python backend/manage.py test petpulse_core accounts pets medications symptoms reminders --verbosity=1
Migrations:    .venv/bin/python backend/manage.py makemigrations --check --dry-run
Build:         cd frontend && npm run build
Frontend unit: cd frontend && npm test
```

Add `reminders` to `INSTALLED_APPS`, the test step in `.github/workflows/CICD.yml`, and the `backend_tests` / `backend_coverage` commands in `CLAUDE.md`.

## Project Structure

```
backend/reminders/                          new app: models, recurrence (next due date), serializers, views, urls, admin, tests, migration
backend/petpulse_core/{settings,urls}.py    register the app, /api/pets/<pet_id>/reminders/ and /api/reminders/
frontend/src/components/RemindersPanel.jsx  pet page section
frontend/src/components/ReminderForm.jsx    add / edit
frontend/src/components/RemindersOverview.jsx  all-pets tab
frontend/src/components/ReminderBell.jsx    top-bar bell
frontend/src/useDueAlerts.js                polling + browser notification (React hook)
frontend/src/dueAlerts.js                   pure alert helpers, tested in dueAlerts.test.js
frontend/src/reminders.js                   labels, default time, "reminders changed" event (tested in reminders.test.js)
frontend/src/components/{PetProfile,OwnerDashboard}.jsx  wire the above in
```

## Code Style

Same as `medications` and `symptoms`: pet loaded through `accessible_pets` (others' pets → 404), validation in the serializer, the date step in its own small pure module (`reminders/recurrence.py`), tests named after the story and criterion.

## Testing Strategy

Django `TestCase` in `backend/reminders/tests.py`:
- CRUD; validation (missing title/kind/due_at, bad repeat, medication with wrong kind, another pet's medication); ordering; `?status=` filter.
- Mark done: sets `done_at`/`done_by`; repeating creates the next one at the right date; non-repeating returns `next: null`; done twice → 400; edit a done one → 400.
- `recurrence.next_due`: weekly, monthly (31st → 28/29th), yearly (Feb 29), time of day kept.
- Linked medicine deleted → reminder kept, link null.
- `/api/reminders/`: only the caller's pets, only open, `?due=1` only due ones.
- `/api/medications/due-doses/` (in `medications/tests.py`): a passed, unmarked daily dose is listed; a marked one, a future time, an ended or not-yet-started medicine, an as-needed medicine and another owner's pet are not.
- Access: other owners 404 on every endpoint, vets 403, anonymous 401.

Frontend: unit tests for the alert helpers (`dueAlerts.test.js`) and the default time (`reminders.test.js`). Browser flow checked by hand at desktop and 390 px.

## Boundaries

- **Always:** run backend tests and the build before calling a task done; PET-5 in commit messages; keep access in `accessible_pets`.
- **Ask first:** new dependencies (e.g. dateutil, pywebpush, Celery); email or push sending; changes to `Medication`.
- **Never:** commit or push without being asked; trust `pet`, `done_at`, `done_by` or `created_by` from the request.

## Success Criteria

1. An owner adds a vaccination reminder for tomorrow 09:00 (yearly); it appears in the pet's list and in the Reminders tab.
2. A medication reminder can be linked to one of the pet's medicines and shows its name; another pet's medicine is refused.
3. When the time passes, the bell shows the count and, if allowed, a browser notification appears once (not again after a reload). The same happens for a daily medicine dose that is due and not given; marking it given clears it.
4. Editing changes it; deleting asks first and removes it.
5. Mark done moves it to Done; a yearly one creates next year's reminder at the same time.
6. Lists are soonest first; overdue ones are marked.
7. Other owners get 404, vets 403, signed-out users 401 on every endpoint.
8. All tests pass (including `reminders` in CI), the build passes, the migration is included.

## Out of Scope (Deferred)

- **Email, SMS or Web Push** (alerts while PetPulse is closed): needs a scheduler and/or new dependencies.
- **Advance notice** ("1 day before"): the owner picks the alert time directly.
- **Links to vaccinations, treatments and vet visits:** come with PET-2 / PET-3 / the visits story.
- **Reminder rows for medicine dose times:** due doses are read live from PET-4's schedule instead (no copies to keep in sync). As-needed medicines have no times, so no alerts.
- **Marking a dose given from the bell or the Reminders tab:** done on the pet page, as in PET-4.
- **Undo "Mark done"**; marking done does **not** log a PET-4 dose.
- **Vet access:** PET-21 extends `accessible_pets`.

## Resolved Questions

1. Jira key: PET-5.
2. Alerts: in-app bell + browser notification while open; no email/push.
3. Links: medications now; others when their records exist.
4. Repeat: none / weekly / monthly / yearly; marking done creates the next one.
5. All-pets list: a third dashboard tab, "Reminders".
6. A done reminder is locked: it can only be deleted, not edited.
8. "Mark done" only from the reminder's due day (found when spamming the button ticked future reminders).
7. Medicine dose times (US-4 AC3) alert through the same bell, computed live from PET-4.
