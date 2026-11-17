# Tasks: Medications and Dose Tracking (PET-4) — V1

Spec: `SPEC-PET-4.md` · Plan: `tasks/plan-PET-4.md`
Backend tests: `.venv/bin/python backend/manage.py test petpulse_core accounts pets medications --verbosity=1`
Build: `cd frontend && npm run build` · Frontend unit: `cd frontend && npm test`
Commits: none by Claude; the user reviews and commits (`PET-4: …`).

## Task 1: Access rule, Medication model and CRUD API, with tests

**Description:** Add `pets/access.py` with `accessible_pets(user)` and switch `PetViewSet.get_queryset` to it. Create the `medications` app with `Medication` (fields from the spec), its migration and admin, `MedicationSerializer` (all validation), and `MedicationViewSet` at `/api/pets/<pet_id>/medications/` (GET, POST, GET/PATCH/DELETE detail). Tests first.

**Acceptance criteria:**
- [x] Create, list, view, edit and delete work for the owner; `pet` and `created_by` come from the URL and the caller, never the body
- [x] Validation: required fields; `DAILY` needs 1–6 valid, distinct "HH:MM" times (stored sorted); `AS_NEEDED` has no times; end date ≥ start date
- [x] Another owner's pet or medicine → 404; vet → 403; signed out → 401; the existing pets tests still pass

**Verification:**
- [x] Tests pass: `.venv/bin/python backend/manage.py test pets medications`
- [x] `makemigrations --check --dry-run` is clean

**Dependencies:** None

**Files likely touched:** `backend/pets/access.py` (new), `backend/pets/views.py`, `backend/medications/*` (new app), `backend/petpulse_core/settings.py`, `backend/petpulse_core/urls.py`

**Estimated scope:** M

## Task 2: Medications section on the pet page

**Description:** Replace the "Medications" coming-soon card in `PetProfile` with `MedicationsPanel`: active medicines first, then ended ones, each showing dosage, frequency and times, and dates, plus Edit and Delete. Add `MedicationForm` for add and edit (frequency switch, add or remove dose times, 1–6). Delete uses a `<dialog>` that says the medicine's doses are deleted too.

**Acceptance criteria:**
- [x] An owner can add, edit and delete medicines without leaving the pet page; server errors appear above the form
- [x] Choosing "As needed" hides the times; the form refuses 0 or 7 times before sending
- [x] Every input has a linked label; the form and list work at 390 px

**Verification:**
- [x] Build passes
- [x] By hand (screenshots): add Carprofen (08:00, 20:00) and an as-needed medicine; edit; delete with confirmation

**Dependencies:** Task 1

**Files likely touched:** `frontend/src/components/MedicationsPanel.jsx` (new), `MedicationForm.jsx` (new), `PetProfile.jsx`, `frontend/src/styles.css`

**Estimated scope:** M

## Checkpoint A
- [x] All backend tests pass; the build passes
- [x] Medicines can be managed end to end in the browser

## Task 3: DoseLog model, mark and undo API, `today` slots, with tests

**Description:** Add `DoseLog` with the conditional unique constraint and its migration. `POST …/medications/<id>/doses/` marks today's dose (`scheduled_time` for daily, nothing for as-needed); the server sets date, `given_at` and `given_by`. `DELETE …/doses/<dose_id>/` lets the marker undo today's dose. Add `is_active` and `today` to the medication response.

**Acceptance criteria:**
- [x] Marking stores today's date, the server time and the caller (AC5); the same daily slot twice → 400; a time not in `dose_times` → 400; a medicine not active today → 400; as-needed can be logged many times
- [x] Undo by the marker → 204; by anyone else → 403 (or 404 if they can't see the pet); a dose from an earlier day → 400
- [x] `today` lists each current time with its dose (`given_at`, `given_by` name, `mine`) or null, plus any of today's doses at other times; as-needed lists today's logged doses

**Verification:**
- [x] Tests pass: `.venv/bin/python backend/manage.py test medications`
- [x] `makemigrations --check --dry-run` is clean

**Dependencies:** Task 1

**Files likely touched:** `backend/medications/{models,serializers,views,urls,admin,tests}.py`, `backend/medications/migrations/0002_*.py`

**Estimated scope:** M

## Task 4: Today's doses on the pet page

**Description:** At the top of `MedicationsPanel`, a "Today" list: one row per daily dose time with a tick button. Once ticked, it shows "Given 08:04 by Noa", and "Undo" when `mine`. As-needed medicines get "Log a dose" and a list of today's logged doses. After each action the panel reloads the medicine list from the server.

**Acceptance criteria:**
- [x] Ticking shows who and when, and is kept after a reload; a refused tick (already given) shows the server's message
- [x] Undo is shown only for your own ticks; ended or not-yet-started medicines show no ticks
- [x] Tick buttons have clear accessible names (e.g. "Mark Carprofen 08:00 as given")

**Verification:**
- [x] Build passes; backend tests pass
- [x] By hand (screenshots): tick, reload, undo, as-needed log; a second browser can't tick the same dose

**Dependencies:** Tasks 2 and 3

**Files likely touched:** `frontend/src/components/MedicationsPanel.jsx`, `frontend/src/styles.css`

**Estimated scope:** M

## Checkpoint B
- [x] All tests pass; the build passes
- [x] AC1, AC2, AC4 and AC5 work end to end; AC3 times are shown (reminders deferred)

## Task 5: CI, responsive and keyboard pass, notes

**Description:** Add `medications` to the CI test step. Check the new screens at 390 px and keyboard-only. Update the local `Claude.yml` notes and the README roadmap if relevant.

**Acceptance criteria:**
- [x] CI runs `petpulse_core accounts pets medications`
- [x] No horizontal scroll at 390 px; every action reachable by keyboard, with visible focus

**Verification:**
- [x] Full test run, build and `makemigrations --check` pass

**Dependencies:** Task 4

**Files likely touched:** `.github/workflows/CICD.yml`, `Claude.yml` (local), `frontend/src/styles.css`

**Estimated scope:** XS

## Checkpoint: Complete
- [x] SPEC-PET-4.md Success Criteria 1–8 all checked
- [x] Changes left uncommitted for the user's review
