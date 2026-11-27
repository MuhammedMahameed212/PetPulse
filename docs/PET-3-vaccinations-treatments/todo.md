# Todo: Vaccinations and Periodic Treatments (PET-3)

Spec: `spec.md` · Plan: `plan.md`

## Phase 1: Backend
- [x] Create `backend/care/` app (apps, models, admin)
- [x] `CareRecord` model + migration
- [x] `care/status.py`: replaced records + `OVERDUE` / `DUE_SOON` / `UP_TO_DATE`
- [x] `CareSerializer` (name and text trimmed, `given_on` not in future, `next_due` after `given_on`, `due_status`, `created_by` name, `mine`)
- [x] `CareViewSet` nested under the pet via `accessible_pets`; `?category=` filter; only the author edits or deletes (403)
- [x] Routes in `care/urls.py` + `petpulse_core/urls.py`
- [x] `care` in `INSTALLED_APPS`, CI test step, CLAUDE.md commands
- [x] Tests: CRUD, validation, ordering, filter, due status, replaced records, author-only, cascade, access (404 / 403 / 401)
- [x] Checkpoint A: backend tests ✓ (81, 14 in `care`), `check` ✓, `makemigrations --check` ✓

## Phase 2: Frontend
- [x] `careNames.js`: suggestions per species and category
- [x] `CareForm.jsx`: add / edit / prefilled "record next dose"
- [x] `CarePanel.jsx`: coming up, history, filter (on screen, one request), delete dialog
- [x] `PetProfile.jsx`: section above Medications; drop the "Treatments" placeholder
- [x] Checkpoint B: `npm test` ✓ (9), build ✓, manual run ✓ (2026-11-27)

## Phase 3: Finish
- [x] Pet-page sections open and close from their title (`RecordSection.jsx`, also used by Medications and Symptoms) — requested during the manual run
- [x] CLAUDE.md: repository structure + completed work
- [x] All success criteria checked; leave uncommitted for `PET-3: …`
