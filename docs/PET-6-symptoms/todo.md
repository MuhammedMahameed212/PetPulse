# Todo: Symptom Log (PET-6)

Spec: `spec.md` · Plan: `plan.md`

## Phase 1: Records
- [x] Create `backend/symptoms/` app (apps, models, admin)
- [x] `SymptomLog` model + migration
- [x] `SymptomSerializer` (description and notes trimmed, `occurred_at` not in future, `created_by` name, `mine`)
- [x] `SymptomViewSet` nested under the pet via `accessible_pets`; `?status=` filter; only the author edits or deletes (403)
- [x] Routes in `symptoms/urls.py` + `petpulse_core/urls.py`
- [x] `symptoms` in `INSTALLED_APPS`, CI test step, CLAUDE.md commands
- [x] Tests: CRUD, validation, ordering, filter, author-only, cascade, access (404 / 403 / 401) — 10 tests
- [x] `SymptomsPanel.jsx`: history, filter, resolve/reopen, delete dialog
- [x] `SymptomForm.jsx`: add / edit
- [x] `PetProfile.jsx`: Symptoms section below Medications
- [x] `petAge.js`: `localDateTime`, `showDateTime` + test
- [x] Checkpoint A: backend tests ✓ (45), `check` ✓, `makemigrations --check` ✓, `npm test` ✓ (7), `npm run build` ✓, app runs on Windows ✓

## Phase 2: Files
- [x] `process_photo(upload, size=PHOTO_SIZE)` in `pets/serializers.py`; pets tests still pass
- [x] `symptoms/media.py`: photo (1280 px) and video (header + 10 MB) checks
- [x] `SymptomAttachment` model + migration
- [x] Upload (limits: 3 files, 1 video), download (content type + nosniff), delete — author only
- [x] Request size guard before reading the body
- [x] Tests: photo, MP4, WebM, 4th file, 2nd video, oversized, fake video, download, delete, cascade, access
- [x] `SymptomForm`: file picker, preview, remove, upload after save
- [x] `AttachmentView.jsx`: fetch with token → blob URL → `<img>` / `<video>`, revoke on unmount
- [ ] Checkpoint B: backend tests ✓ (67, incl. MOV and HEIC-not-video), `makemigrations --check` ✓, `npm test` ✓, build ✓ — **manual run (2 photos + 1 video, reload, refusals) still to do**

## Phase 3: Finish
- [ ] 390 px and keyboard pass
- [ ] CLAUDE.md: repository structure + completed work
- [ ] All success criteria checked; leave uncommitted for `PET-6: …`
