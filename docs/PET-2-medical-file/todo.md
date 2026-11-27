# Todo: Pet Medical File (PET-2)

Spec: `spec.md` · Plan: `plan.md`

## Phase 1: Backend
- [x] Create `backend/medical_file/` app (apps, no models)
- [x] `timeline.py`: `care_events`, `medication_events`, `symptom_events`, `build_timeline` (order: date, time, id)
- [x] `MedicalFileView` at `/api/pets/<pet_id>/medical-file/` via `accessible_pets`; owners only
- [x] Route in `medical_file/urls.py` + `petpulse_core/urls.py`
- [x] `medical_file` in `INSTALLED_APPS`, CI test step, CLAUDE.md commands
- [x] Tests: each source, vaccine vs treatment, medication ended only when past, symptom local time, order, only this pet, access (404 / 403 / 401)
- [x] Checkpoint A: backend tests ✓ (89, 8 in `medical_file`), `check` ✓, `makemigrations --check` ✓ (no migrations)

## Phase 2: Frontend
- [x] `medicalFile.js`: group events by month + `medicalFile.test.js`
- [x] `MedicalFilePanel.jsx`: filter, month headings, events as links to their section, reload when opened
- [x] `RecordSection.jsx`: open and scroll when the URL hash is `#<id>-section`, then clear the hash; `onOpen` callback
- [x] `PetProfile.jsx`: Medical file first; the placeholder card becomes "Vet visits"
- [x] Checkpoint B: `npm test` ✓ (12), build ✓, manual run ✓ (2026-11-27)

## Phase 3: Finish
- [x] CLAUDE.md: repository structure + completed work
- [x] All success criteria checked (AC6 vet access waits for PET-21)
