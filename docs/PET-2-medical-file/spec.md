# Spec: Pet Medical File (PET-2) — V1

Status: approved (2026-11-27)
Jira: PET-2 (US-2), Milestone 2 (PET-25)
Branch: `PET-2-US-2-ניהול-התיק-הרפואי-של-חיית-המחמד`
Depends on: PET-3 (vaccinations and treatments), PET-4 (medications), PET-6 (symptoms), all through `accessible_pets`.
Related: vet visits (their own story) and PET-7 (documents) add event types later; PET-9 (summary export) can reuse the same timeline; PET-21 (sharing) opens it to vets.

## Objective

Owners see one organised medical file per pet: every medical event (vaccinations, treatments, medications, symptoms) on a single timeline, newest first, grouped by month and filterable by type, so the pet's medical history is easy to follow and show to a vet.

User story (US-2): As a pet owner, I want to manage a digital medical file for my pet, so I can keep and follow its medical information in an organised and accessible way.

| AC | Acceptance criterion | How V1 meets it |
|----|---------------------|-----------------|
| AC1 | View the medical file of every pet on the account | A "Medical file" section on each pet's page, first on the page |
| AC2 | The file includes vaccinations, treatments, medications, vet visits and medical documents | Vaccinations, treatments (PET-3), medications (PET-4) and symptoms (PET-6) now. **Vet visits** come with their own story and **documents** with PET-7: each adds one event source to the timeline |
| AC3 | Add and update medical information, by permission | Through the existing sections (each already has add / edit / delete, author-only). Clicking an event in the file opens its section |
| AC4 | Shown organised by event type and event date | One timeline, newest first, grouped by month; each event has a type badge; filter All / Vaccines / Treatments / Medications / Symptoms |
| AC5 | Keeps the pet's medical history over time | Every record stays in the file until its author deletes it; replaced vaccine doses and ended medications stay as history |
| AC6 | Vets and clinic staff view and update, by permission | **Depends on PET-21 (sharing).** The endpoint loads the pet through `accessible_pets(user)`; in V1 vets get 403 |

## Data Model

No new tables. New app `backend/medical_file/` that only reads the other apps' records.

**Timeline event** (built in `medical_file/timeline.py`, not stored)

| Field | Example | Meaning |
|-------|---------|---------|
| `id` | `"care-7-given"` | unique in the file: section, record id and event (a medicine has two events) |
| `type` | `VACCINE` / `TREATMENT` / `MEDICATION` / `SYMPTOM` | for the badge and the filter |
| `event` | `GIVEN` / `STARTED` / `ENDED` / `NOTED` | what happened |
| `date` | `"2026-11-22"` | the day it happened (local date) |
| `time` | `"19:30"` or `null` | symptoms only (they have a time) |
| `title` | `"Rabies"` | the record's name or description |
| `detail` | `"Dr. Levi, Haifa Vet"` | one short line, see below |
| `section` | `care` / `meds` / `symptoms` | which pet-page section the record lives in |
| `record_id` | `7` | the record's id in that section |

**Where events come from**

| Source | Events | `type` | `detail` |
|--------|--------|--------|----------|
| CareRecord (PET-3) | one `GIVEN` on `given_on` | `VACCINE` for category Vaccine; `TREATMENT` for Flea & tick, Deworming, Other | category name for treatments, then given by (if any) |
| Medication (PET-4) | `STARTED` on `start_date`; `ENDED` on `end_date` once it is in the past | `MEDICATION` | dosage and schedule, e.g. "250 mg · daily at 08:00, 20:00" |
| SymptomLog (PET-6) | one `NOTED` on `occurred_at` | `SYMPTOM` | severity and status, e.g. "Moderate · Ongoing" |

Daily doses given are **not** events: a twice-a-day medicine for a month would add 60 rows. They stay in the Medications section.

**Order:** newest date first; on the same day, the later time first (events without a time come after those with one); then by `id` so the order never changes between loads.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/pets/<pet_id>/medical-file/` | the timeline, newest first |

Signed-in pet owner only. A pet the caller can't access answers 404, vets get 403 (until PET-21), signed-out users 401. Read-only: adding and editing stay on each record's own endpoint.

Response:

```json
[
  { "id": "symptoms-12-noted", "type": "SYMPTOM", "event": "NOTED", "date": "2026-11-22", "time": "19:30",
    "title": "Limping on the front left leg", "detail": "Moderate · Ongoing", "section": "symptoms", "record_id": 12 },
  { "id": "care-7-given", "type": "VACCINE", "event": "GIVEN", "date": "2026-11-01", "time": null,
    "title": "Rabies", "detail": "Dr. Levi, Haifa Vet", "section": "care", "record_id": 7 }
]
```

The whole history is returned in one response (no paging): a pet has tens to a few hundred records, not thousands. Paging can come later if a file grows that large.

## Frontend

- **Medical file section (`MedicalFilePanel`)**, first on the pet page, in a `RecordSection` (closed at first, like the others). The "Medical file" placeholder card becomes "Vet visits", the part that is still to come.
  - Filter: All / Vaccines / Treatments / Medications / Symptoms (on screen; one request).
  - Month headings ("November 2026"), events newest first under each.
  - Each event: date (and time for symptoms), a coloured type badge, what happened ("Given", "Started", "Ended", "Noted"), the title and the detail line.
  - Clicking an event opens its section on the page and scrolls to it.
  - Empty state: "Nothing in Milo's medical file yet. Add a vaccination, medicine or symptom below."
- **`RecordSection`** gets an outside way to open: when the URL hash becomes `#<id>-section` it opens and scrolls into view, then clears the hash (so the same link works again and another pet's page doesn't open that section). Events are plain links to that hash, so they work with the keyboard.
- The file reloads when it is opened, so changes made in the other sections show up.

## Tech Stack

Unchanged. No new dependencies.

## Commands

```
Backend tests: .venv/bin/python backend/manage.py test petpulse_core accounts pets medications symptoms care medical_file --verbosity=1
Migrations:    .venv/bin/python backend/manage.py makemigrations --check --dry-run
Build:         cd frontend && npm run build
Frontend unit: cd frontend && npm test
```

Add `medical_file` to `INSTALLED_APPS`, the test step in `.github/workflows/CICD.yml`, and the `backend_tests` / `backend_coverage` commands in `CLAUDE.md`.

## Project Structure

```
backend/medical_file/                       new app (no models): timeline, views, urls, tests
backend/petpulse_core/{settings,urls}.py    register the app and its route
frontend/src/components/MedicalFilePanel.jsx  the timeline section
frontend/src/medicalFile.js                 group events by month (tested in medicalFile.test.js)
frontend/src/components/RecordSection.jsx   opens from the URL hash
frontend/src/components/PetProfile.jsx      shows the section; the placeholder card becomes "Vet visits"
```

## Code Style

`timeline.py` holds one small function per source (`care_events`, `medication_events`, `symptom_events`) and one that merges and sorts them; adding vet visits or documents later means adding one function. The view only loads the pet through `accessible_pets` and returns the list.

## Testing Strategy

Django `TestCase` in `backend/medical_file/tests.py`:
- Each source gives the right events: vaccine vs treatment type, medication started and ended (an end date today or later gives no ENDED yet), symptom with its local time.
- Order: newest first, time within a day, stable for equal dates.
- Only this pet's records.
- Access: other owners 404, vets 403, anonymous 401.

`node --test` for the month grouping. Browser flow checked by hand at desktop and 390 px.

## Boundaries

- **Always:** run backend tests and the build before calling a task done; PET-2 in commit messages; keep all access checks in `accessible_pets`.
- **Ask first:** new dependencies; storing timeline rows in a table; paging.
- **Never:** commit or push without being asked; write records through the medical-file endpoint.

## Success Criteria

1. A pet's Medical file shows its vaccinations, treatments, medicines (started and ended) and symptoms on one timeline, newest first, under month headings.
2. The type filter shows only that type.
3. Clicking an event opens its section and scrolls to it.
4. A record added, edited or deleted in a section shows the change when the file is opened again.
5. Other owners get 404, vets 403 and signed-out users 401.
6. All tests pass (including `medical_file` in CI) and the build passes.

## Out of Scope (Deferred)

- **Vet visits:** their own story; adds a `VISIT` event source.
- **Medical documents:** PET-7; adds a `DOCUMENT` event source.
- **Vet and clinic access** (AC6): PET-21.
- **Export or print the file:** PET-9.
- **Daily doses on the timeline.**

## Resolved Questions

1. Place: a section on the pet page, first, opening and closing like the others.
2. Organisation: one timeline grouped by month, type badge, type filter.
3. Medications: STARTED and ENDED events; no daily doses.
4. Built on the server: one read-only endpoint in a new `medical_file` app.
5. Vet access: PET-21.
