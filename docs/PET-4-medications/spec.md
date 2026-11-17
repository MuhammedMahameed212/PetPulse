# Spec: Medications and Dose Tracking (PET-4) — V1

Status: implemented (2026-11-17)
Jira: PET-4 (US-4), Milestone 2 (PET-25)
Depends on: PET-1 (Pet model and pet page), already merged into this branch through `develop`.

## Objective

Owners record each pet's medicines and tick off every dose, so treatment is given on time and anyone can see what was given, when, and by whom.

User story (US-4): As a pet owner, I want to manage my pet's medications and track when each dose is given, so treatment is given on time and in an orderly way.

| AC | Acceptance criterion | How V1 meets it |
|----|---------------------|-----------------|
| AC1 | Add a new medication to the pet's medical file | "Add medication" on the pet's Medications section |
| AC2 | Name, dosage, frequency, start date, end date | All stored; frequency is "Daily at set times" or "As needed"; end date is optional (ongoing) |
| AC3 | Set dose times and get reminders | Dose times are set per medication (e.g. 08:00 and 20:00) and shown as today's doses. **Reminders are deferred** to a separate notifications story |
| AC4 | Mark a dose as given | A tick per scheduled dose for **today**; "Log a dose" for as-needed medicines |
| AC5 | Store when the action was done and by whom | Each dose stores the server time it was marked and the user who marked it |
| AC6 | View dose history | **Deferred to a separate history story.** V1 stores every dose (AC5) and shows today's doses with who gave them, so the history screen can be built on this data later |
| AC7 | Vets and clinic staff can add and update medicines, by permission | **Depends on PET-21 (sharing).** All access goes through one function, `accessible_pets(user)`, which PET-21 extends to vets the owner shared the pet with. In V1 vets get 403 |

## Data Model

New app `backend/medications/`.

**Medication**

| Field | Type | Rules |
|-------|------|-------|
| `pet` | FK → `pets.Pet`, CASCADE, `related_name="medications"` | set from the URL, never from the body |
| `name` | Char(100) | required, trimmed |
| `dosage` | Char(60) | required, free text, e.g. "1 tablet (25 mg)", "5 ml" |
| `frequency` | Char choices `DAILY` / `AS_NEEDED` | required |
| `dose_times` | JSON list of `"HH:MM"` | `DAILY`: 1–6 distinct times, stored sorted; `AS_NEEDED`: must be empty |
| `start_date` | Date | required; may be in the future (a planned course) |
| `end_date` | Date, nullable | empty = ongoing; must be ≥ `start_date` |
| `notes` | Char(300), blank | e.g. "Give with food" |
| `created_by` | FK → User, SET_NULL, nullable | the caller |
| `created_at`, `updated_at` | DateTime | automatic |

Ordering: active medications first, then by name.

**DoseLog** (one row = one dose given)

| Field | Type | Rules |
|-------|------|-------|
| `medication` | FK → Medication, CASCADE, `related_name="doses"` | from the URL |
| `scheduled_date` | Date | the day the dose belongs to; always today in V1, set by the server |
| `scheduled_time` | Time, nullable | the dose time for `DAILY`; null for `AS_NEEDED` |
| `given_at` | DateTime | set by the server when marked (AC5) |
| `given_by` | FK → User, SET_NULL, nullable | the caller (AC5) |

A `DAILY` dose slot (medication + date + time) can be marked only once: a unique constraint stops two family members ticking the same dose twice. `AS_NEEDED` doses can be logged any number of times per day.

**Rules for marking a dose**
- Only today's doses can be marked; the server sets the date, so the client can't pick another day. Earlier days that weren't ticked simply stay unmarked.
- The medication must be active today (`start_date` ≤ today, and `end_date` empty or ≥ today).
- For `DAILY`, the time must be one of the medication's current `dose_times`.
- "Today" is the server's local date (`TIME_ZONE = Asia/Jerusalem`).

**Changing a medication** never rewrites history: a dose keeps the date and time it was given for. Deleting a medication deletes its doses (the dialog says so); to stop a course, owners set an end date instead.

**Undo:** only the user who marked a dose can delete it (others get 403), and only on the same day, since only today's doses are shown. Undone doses are removed; only doses that stand are kept.

## API

All endpoints need a signed-in pet owner. A pet the caller can't access answers 404, and vets get 403 (until PET-21).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/pets/<pet_id>/medications/` | list, each with `is_active` and `today`: the day's slots, each with its dose or `null` |
| POST | `/api/pets/<pet_id>/medications/` | add (201) |
| GET / PATCH / DELETE | `/api/pets/<pet_id>/medications/<id>/` | view, edit, delete |
| POST | `/api/pets/<pet_id>/medications/<id>/doses/` | mark today's dose: `{ "scheduled_time": "08:00" }`, or `{}` for as-needed; 201 |
| DELETE | `/api/pets/<pet_id>/medications/<id>/doses/<dose_id>/` | undo own mark; 204 |

Medication response:

```json
{
  "id": 3, "name": "Carprofen", "dosage": "1 tablet (25 mg)", "frequency": "DAILY",
  "dose_times": ["08:00", "20:00"], "start_date": "2026-11-10", "end_date": "2026-11-24",
  "notes": "With food", "is_active": true,
  "today": [
    { "time": "08:00", "dose": { "id": 41, "given_at": "2026-11-17T08:04:12+02:00", "given_by": "Noa", "mine": true } },
    { "time": "20:00", "dose": null }
  ]
}
```

For as-needed medicines, `today` lists the doses logged today (each with `time: null`). `given_by` is the user's first name, or their username when the first name is empty. `mine` tells the screen whether to show "Undo".

## Frontend

The "Medications" entry point on the pet page (a "Coming in a later release" card from PET-1) becomes live:

- **Medications section on the pet page:**
  - "Today" lists every active daily dose with a tick button. Once ticked, it shows "Given 08:04 by Noa", plus "Undo" when it's yours.
  - As-needed medicines get a "Log a dose" button.
  - Below that come active medicines, then ended ones, each with name, dosage, frequency and times, dates, and Edit and Delete.
- **Add / edit medication form:**
  - name, dosage, frequency (Daily at set times / As needed), dose times (add or remove a time, 1–6), start date, optional end date, notes;
  - linked labels; works at 390 px.
- Delete asks for confirmation in the same `<dialog>` style as deleting a pet.

## Tech Stack

Unchanged: Django 5.2 + DRF 3.18, React 18 + Vite 6. `JSONField` works on both SQLite and Postgres. No new dependencies.

## Commands

```
Backend tests: .venv/bin/python backend/manage.py test petpulse_core accounts pets medications --verbosity=1
Migrations:    .venv/bin/python backend/manage.py makemigrations --check --dry-run
Build:         cd frontend && npm run build
Frontend unit: cd frontend && npm test
```

CI: add `medications` to the test step in `.github/workflows/CICD.yml`.

## Project Structure

```
backend/medications/                     new app: models, serializers, views, urls, admin, tests, migration
backend/pets/access.py                   accessible_pets(user) — the one place PET-21 extends for vets
backend/petpulse_core/{settings,urls}.py register the app and its routes
frontend/src/components/MedicationsPanel.jsx   today's doses + medication list (on the pet page)
frontend/src/components/MedicationForm.jsx     add / edit
frontend/src/components/PetProfile.jsx         Medications entry point goes live
```

## Code Style

Same as the `pets` app: an owner-scoped queryset (so other owners' data answers 404), validation in the serializer, and tests named after the story and criterion.

```python
def accessible_pets(user):
    """Pets this user may manage. PET-21 adds pets shared with a vet."""
    return Pet.objects.filter(owner=user)
```

## Testing Strategy

Django `TestCase` in `backend/medications/tests.py`:
- Create, list, edit and delete a medication, including validation: missing fields, a bad time, 0 or 7 times, times given for as-needed, end before start.
- Mark a dose: the server records today's date, the time and the user (AC5); a slot can't be marked twice; a medicine not active today can't be marked; only real dose times; unlimited as-needed doses.
- Undo: allowed for your own mark; another owner gets 404; a shared-pet case is covered once PET-21 adds it.
- `today` slots, for active, ended and not-yet-started medicines.
- Access: other owners get 404, vets 403, anonymous 401.

The browser flow is checked by hand at desktop and 390 px. Any date logic in the browser gets a `node --test` file, as for `petAge`.

## Boundaries

- **Always:** run backend tests and the build before calling a task done; PET-4 in commit messages (the user commits); keep all access checks in `accessible_pets`.
- **Ask first:** new dependencies; a router; changes to the `Pet` model; anything that sends notifications.
- **Never:** commit or push; trust `pet`, `given_by` or `given_at` from the request body; delete another user's dose mark.

## Success Criteria

1. An owner adds a daily medicine with two times and an as-needed medicine to a pet; both appear on the pet page.
2. Today's doses show for the daily medicine; ticking one shows the time and "by <name>", and it is kept after a reload.
3. The same dose can't be ticked twice, even from two browsers; only today's doses can be ticked.
4. "Undo" removes your own mark; the API refuses to undo another user's mark.
5. Every tick is stored with when and by whom (checked in the API and the admin), ready for the history story.
6. Editing a medicine's times doesn't change doses already given; deleting a medicine asks first.
7. Other owners get 404, vets 403 and signed-out users 401 on every endpoint.
8. All tests pass (including `medications` in CI), the build passes, and the migrations are included in the changes.

## Out of Scope (Deferred)

- **Reminders and notifications** (AC3, second half): a separate story.
- **Vet and clinic access** (AC7): PET-21 extends `accessible_pets`.
- **Dose history screen** (AC6): a separate story; the data is stored from V1.
- **Ticking missed doses from earlier days.**
- **Schedules every N days or weekly:** only daily times and as-needed in V1.
- **Adherence statistics and missed-dose alerts.**
- **Editing a dose's given time, or per-user time zones.**
- **Vaccinations:** a separate story.

## Resolved Questions

1. Vet access: deferred to PET-21, through `accessible_pets`.
2. Schedules: daily at set times, or as needed.
3. Undo: the user who marked a dose can undo it.
4. Missed doses: only today's doses can be ticked in V1.
5. Dose history: a separate story; V1 stores the data.
