# Implementation Plan: Pet Medical File (PET-2) — V1

Source spec: `spec.md`
Task list: `todo.md`. Jira tracks the story as a whole (PET-2).

## Overview

A read-only "Medical file" timeline on the pet page that merges the pet's vaccinations, treatments, medications and symptoms, newest first, grouped by month, with a type filter. Built on the server (one endpoint) so the rules live in one tested place and later stories (vet visits, documents, export) plug in.

## Dependency Graph

```
pets.access.accessible_pets(user)
  └── medical_file/timeline.py   care_events · medication_events · symptom_events → build_timeline
        └── MedicalFileView      GET /api/pets/<pet_id>/medical-file/
              └── MedicalFilePanel (+ medicalFile.js month grouping)
                    └── RecordSection opens from #<id>-section (click on an event)
```

## Architecture Decisions

- **New app `medical_file` with no models.** The file is a view over records the other apps own; copying them into a table would mean keeping two copies in sync.
- **One function per source in `timeline.py`.** Vet visits and documents each add one function and one line in `build_timeline`.
- **Events are plain dicts**, not a serializer: the endpoint is read-only and the shape is small.
- **Local dates and times on the server** (`Asia/Jerusalem`), the same as PET-3, so a symptom at 00:30 lands on the right day.
- **Filter and month grouping on screen.** One request; the grouping is a tested pure function in `medicalFile.js`.
- **Open a section through the URL hash.** The event is a link to `#care-section`; `RecordSection` opens when the hash names it, then clears the hash. No shared state between sections, and the keyboard works.

## Task List

### Phase 1: Backend (AC1, AC2, AC4, AC5, AC6 hook)
- [x] Task 1: `medical_file` app, `timeline.py`, view, route; register in settings, urls, CI and CLAUDE.md; tests

### Checkpoint A
- [x] All backend tests pass; `makemigrations --check` is clean (no migrations)

### Phase 2: Frontend (AC1, AC3, AC4)
- [x] Task 2: `medicalFile.js` month grouping + test
- [x] Task 3: `MedicalFilePanel` (filter, months, events as links); `RecordSection` opens from the hash; on the pet page, drop the placeholder

### Checkpoint B
- [x] Build passes; `npm test` passes
- [x] By hand: all four types show, filter, click opens the section, changes show after reopening; desktop and 390 px

### Phase 3: Finish
- [x] Task 4: CLAUDE.md structure + completed work, todo ticked

### Checkpoint: Complete
- [x] Every Success Criterion in spec.md (1–6) is checked

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| The file and the sections show different data after an edit | Med | The file reloads each time it is opened |
| A very long history makes one response heavy | Low | Few hundred small rows at most; paging later if needed |
| A future source forgets the access rule | Low | Sources only read from the pet the view already loaded through `accessible_pets` |

## Parallelization

The frontend needs the endpoint, so the work runs in order.

## Open Questions

None. Resolved in spec.md.
