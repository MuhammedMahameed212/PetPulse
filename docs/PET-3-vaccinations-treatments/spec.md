# Spec: Vaccinations and Periodic Treatments (PET-3) — V1

Status: approved (2026-11-26)
Jira: PET-3 (US-3), Milestone 2 (PET-25)
Branch: `PET-3-US-3-ניהול-חיסונים-וטיפולים-תקופתיים`
Depends on: PET-1 (Pet model, pet page) and PET-4 (`accessible_pets`, nested-app pattern).
Related: US-5 (reminders) will link to `next_due`; US-2 (medical file) will show these records on its timeline; PET-21 (sharing) opens them to vets.

## Objective

Owners record each vaccination and periodic treatment (flea and tick, deworming…) their pet gets, see what was done before, and see at a glance what is overdue or coming up, so they know when the next one is needed.

User story (US-3): As a pet owner, I want to manage and track my pet's vaccinations and periodic treatments, so I know which were already done and when the next one is needed.

| AC | Acceptance criterion | How V1 meets it |
|----|---------------------|-----------------|
| AC1 | Add a new vaccination or treatment to the pet's medical file | "Add" on the pet's Vaccinations & treatments section |
| AC2 | Store details such as type, date given, next due date and notes | Category, name, date given, next due date (optional), given by (optional), notes |
| AC3 | View the list of past vaccinations and treatments | History newest first, filter by category |
| AC4 | Edit or update existing information, by permission | Edit and delete with confirmation, **only by the user who created the record** |
| AC5 | Vets and clinic staff can enter and update them, by permission | **Depends on PET-21 (sharing).** All access goes through `accessible_pets(user)`; in V1 vets get 403 |
| AC6 | When a future date is set, the system can create a reminder for it | V1 stores `next_due` and shows its status (**Overdue / Due soon / Up to date**). Sending the reminder is **US-5**, which links to this record |

## Data Model

New app `backend/care/` (one model for vaccinations and treatments: they have the same fields).

**CareRecord** (one row = one vaccination or treatment given once)

| Field | Type | Rules |
|-------|------|-------|
| `pet` | FK → `pets.Pet`, CASCADE, `related_name="care_records"` | set from the URL, never from the body |
| `category` | Char choices `VACCINE` / `FLEA_TICK` / `DEWORMING` / `OTHER` | required |
| `name` | Char(100) | required, trimmed; e.g. "Rabies", "NexGard" |
| `given_on` | Date | required; not in the future |
| `next_due` | Date, nullable | optional; must be after `given_on` |
| `given_by` | Char(100), blank | optional: clinic or vet name |
| `notes` | Text, max 2000, blank | batch number, reactions… |
| `created_by` | FK → User, SET_NULL, nullable | the caller |
| `created_at`, `updated_at` | DateTime | automatic |

Ordering: newest `given_on` first.

**Due status** (computed, not stored), in `care/status.py`:
- A record is **replaced** when the same pet has a later record with the same category and name (case-insensitive). Giving the next dose "closes" the previous one; there is no separate "mark done".
- For a record that is not replaced and has `next_due`:
  - `OVERDUE` when `next_due` is before today,
  - `DUE_SOON` when it is within the next 30 days,
  - `UP_TO_DATE` otherwise.
- A replaced record, or one without `next_due`, has `due_status: null`.
- "Today" is the server's local date (`Asia/Jerusalem`).

## API

All endpoints need a signed-in pet owner. A pet the caller can't access answers 404, vets get 403 (until PET-21), signed-out users 401.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/pets/<pet_id>/care/` | history, newest first; `?category=VACCINE` etc. filters |
| POST | `/api/pets/<pet_id>/care/` | add (201) |
| GET / PATCH / DELETE | `/api/pets/<pet_id>/care/<id>/` | view, edit, delete |

Only the user who created a record can edit or delete it; anyone else who can see the pet gets 403. The response has `mine: true|false` so the screen shows Edit and Delete only on your own records.

Record response:

```json
{
  "id": 7, "category": "VACCINE", "name": "Rabies",
  "given_on": "2025-12-01", "next_due": "2026-12-01", "given_by": "Dr. Levi, Haifa Vet",
  "notes": "Batch 4471", "due_status": "DUE_SOON",
  "created_by": "Noa", "mine": true, "created_at": "...", "updated_at": "..."
}
```

## Frontend

A new section on the pet page, above Medications, replacing the "Treatments" placeholder card:

- **Vaccinations & treatments section (`CarePanel`):**
  - **Coming up:** every record with a `due_status`, soonest `next_due` first, with an Overdue / Due soon / Up to date badge and a "Record next dose" button that opens the form with the same category and name filled in.
  - **History:** all records, newest first; filter All / Vaccines / Flea & tick / Deworming / Other. Each shows the date, name, category, given by, next due and notes; Edit and Delete on your own records.
- **Add / edit form (`CareForm`):** category, name, date given (default today), next due (optional), given by, notes. The name field suggests common names for the pet's species and the chosen category (`<datalist>`; any name can still be typed).
- Delete asks for confirmation in the same `<dialog>` style as the other records.

Name suggestions (`frontend/src/careNames.js`):

| Category | Dog | Cat | Other species |
|----------|-----|-----|---------------|
| Vaccine | Rabies, DHPP, Leptospirosis, Bordetella (kennel cough) | Rabies, FVRCP, FeLV | — |
| Flea & tick | NexGard, Bravecto, Simparica, Frontline, Seresto collar | Bravecto, Frontline, Revolution | — |
| Deworming | Drontal, Milbemax, Panacur | Drontal, Milbemax, Profender | — |

## Tech Stack

Unchanged: Django 5.2 + DRF 3.18, React 18 + Vite 6. No new dependencies.

## Commands

```
Backend tests: .venv/bin/python backend/manage.py test petpulse_core accounts pets medications symptoms care --verbosity=1
Migrations:    .venv/bin/python backend/manage.py makemigrations --check --dry-run
Build:         cd frontend && npm run build
Frontend unit: cd frontend && npm test
```

Add `care` to `INSTALLED_APPS`, the test step in `.github/workflows/CICD.yml`, and the `backend_tests` / `backend_coverage` commands in `CLAUDE.md`.

## Project Structure

```
backend/care/                            new app: models, status (due status), serializers, views, urls, admin, tests, migration
backend/petpulse_core/{settings,urls}.py register the app and its routes
frontend/src/components/CarePanel.jsx    coming up + history + filter (on the pet page)
frontend/src/components/CareForm.jsx     add / edit
frontend/src/careNames.js                name suggestions per species and category
frontend/src/components/PetProfile.jsx   shows the section; drops the "Treatments" placeholder
```

## Code Style

Same as `symptoms`: the pet is loaded through `accessible_pets`, validation lives in the serializer, the due-status rule in its own small module with no Django request code, tests named after the story and criterion.

## Testing Strategy

Django `TestCase` in `backend/care/tests.py`:
- Create, list, edit and delete; validation: missing name or category, future `given_on`, `next_due` not after `given_on`, bad category.
- History newest first; `?category=` filter.
- Due status: overdue, due soon (today + 30 days is still "soon"), up to date, no `next_due`, and a record replaced by a later one with the same name in another letter case.
- Author-only edit and delete; records deleted with the pet.
- Access: other owners get 404, vets 403, anonymous 401.

The browser flow is checked by hand at desktop and 390 px.

## Boundaries

- **Always:** run backend tests and the build before calling a task done; PET-3 in commit messages (the user commits); keep all access checks in `accessible_pets`.
- **Ask first:** new dependencies; changes to the `Pet` model; sending reminders (that is US-5).
- **Never:** commit or push; trust `pet` or `created_by` from the request.

## Success Criteria

1. An owner adds a Rabies vaccine with a next due date; it appears in the history and under "Coming up" with the right status.
2. "Record next dose" adds the new dose, and the old one leaves "Coming up".
3. Editing and deleting work (with confirmation); only the author sees Edit and Delete.
4. The category filter works; the history is newest first.
5. A future date given, or a next due date not after the date given, is refused with a clear message.
6. Other owners get 404, vets 403 and signed-out users 401 on every endpoint.
7. All tests pass (including `care` in CI), the build passes, and the migration is included.

## Out of Scope (Deferred)

- **Sending reminders or notifications** (AC6): US-5.
- **Vet and clinic access** (AC5): PET-21.
- **Vet visits:** their own story.
- **Vaccine certificates and documents:** PET-7.
- **Automatic next-due dates** from a vaccine schedule (would need per-country veterinary rules).

## Resolved Questions

1. One model with a category, not separate vaccination and treatment models.
2. Status per vaccine or treatment (Overdue / Due soon / Up to date); the next dose replaces the previous one.
3. Edit and delete: only the user who created the record.
4. Name suggestions per species and category; free text still allowed.
5. Reminders: US-5. Vet access: PET-21.
