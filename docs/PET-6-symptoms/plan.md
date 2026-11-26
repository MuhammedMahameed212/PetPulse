# Implementation Plan: Symptom Log and Health Changes (PET-6) — V1

Source spec: `spec.md`
Task list: `todo.md`. Jira tracks the story as a whole (PET-6).

## Overview

Owners add symptom records to a pet (date and time, description, severity, status, notes) and attach up to 3 photos or one short video; the pet page shows the history with a filter. Built in two vertical slices: "records" (model + API + screens), then "files" (attachment model + API + upload and viewing). Vet access comes with PET-21.

## Dependency Graph

```
pets.access.accessible_pets(user)
  └── SymptomLog model + SymptomViewSet     /api/pets/<pet_id>/symptoms/
        ├── SymptomsPanel + SymptomForm on the pet page (new section below Medications)
        └── SymptomAttachment model + upload / download / delete   …/symptoms/<id>/attachments/
              ├── symptoms/media.py (photo via process_photo, video header check)
              └── AttachmentView + file picker in SymptomForm
```

## Architecture Decisions

- **New app `symptoms`.** Same pattern as `medications`: nested under the pet, the pet loaded through `accessible_pets`, so PET-21 opens it to vets by changing one function.
- **Files in the database (`BinaryField`), in their own table.** Render's free disk is wiped on deploy. A separate table keeps the list query light (it never loads the bytes: `defer("data")`) and allows several files per record.
- **One file per request.** Keeps each request ≤ 10 MB, lets the form show progress per file, and a failed upload doesn't lose the record. The form saves the record first, then uploads new files and deletes removed ones.
- **Download endpoint + blob URL** instead of data URLs (the pet photo's approach). Data URLs inside the list would make a history with videos huge; the endpoint is fetched only when a file is shown.
- **`process_photo` gets a `size` parameter** (default 512 px, so pets don't change); symptoms call it with 1280 px. One place for image safety (EXIF/GPS stripped, decompression-bomb guard).
- **Video checked by its first bytes** (`ftyp` for MP4/MOV, EBML for WebM), never by file name or the browser's content type. No transcoding: no new dependency.
- **Request size guard** before reading the body, as in `PetViewSet` (10 MB + 1 MB for the form).
- **Frontend stays inside `PetProfile`**, like medications: `SymptomsPanel` switches between the list and `SymptomForm` with local state. No router.

## Task List

### Phase 1: Records (AC1, AC2, AC4, AC5, AC6 hook, AC7)
- [x] Task 1: `symptoms` app, SymptomLog model, CRUD API with `?status=` filter, migration, tests; register in settings, urls, CI and CLAUDE.md
- [x] Task 2: Symptoms section on the pet page: history + filter, add/edit form, delete with confirmation, resolve/reopen

### Checkpoint A
- [x] All backend tests pass; the build passes; `makemigrations --check` is clean
- [ ] By hand: add, edit, resolve, filter, delete

### Phase 2: Files (AC3)
- [x] Task 3: `process_photo(size=…)`, `symptoms/media.py`, SymptomAttachment model, upload / download / delete API, limits, tests
- [x] Task 4: File picker in the form (preview, remove), `AttachmentView` (blob URL), thumbnails in the history

### Checkpoint B
- [x] All tests pass; the build passes
- [ ] By hand: 2 photos + 1 video → reload → shown; 4th file / 2nd video / oversized / fake video refused

### Phase 3: Finish
- [ ] Task 5: 390 px and keyboard pass, project notes in CLAUDE.md, todo ticked

### Checkpoint: Complete
- [ ] Every Success Criterion in spec.md (1–8) is checked
- [ ] Changes left uncommitted for the user (commit with `PET-6: …`)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Videos fill the free 1 GB Postgres | Med | 10 MB per video, one per record; monitored in the admin; cloud storage is a later story if needed |
| A file pretending to be an image or video | Med | Photos are decoded and re-encoded by Pillow; videos checked by header; served with our stored content type and `X-Content-Type-Options: nosniff` |
| Large uploads exhaust server memory | Med | Size checked from `Content-Length` before reading the body, and again on the file |
| MOV from iPhone doesn't play in some browsers | Low | Accepted as uploaded; the screen offers "Download" when the browser can't play it |
| Changing `process_photo` breaks pet photos | Low | New parameter defaults to the current 512 px; the pets tests must still pass |
| Blob URLs leak memory | Low | `URL.revokeObjectURL` when `AttachmentView` unmounts |

## Parallelization

Each frontend task needs its backend API, so the work runs in order.

## Open Questions

None. Resolved in spec.md.
