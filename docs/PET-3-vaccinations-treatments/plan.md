# Implementation Plan: Vaccinations and Periodic Treatments (PET-3) — V1

Source spec: `spec.md`
Task list: `todo.md`. Jira tracks the story as a whole (PET-3).

## Overview

Owners add vaccinations and periodic treatments to a pet (category, name, date given, next due, given by, notes), see the history with a category filter, and a "Coming up" list with Overdue / Due soon / Up to date. Built as one vertical slice: model + API + status rule, then the pet-page section. Reminders come with US-5, vet access with PET-21.

## Dependency Graph

```
pets.access.accessible_pets(user)
  └── CareRecord model + CareViewSet        /api/pets/<pet_id>/care/
        ├── care/status.py (replaced records, due status)
        └── CarePanel + CareForm on the pet page (new section above Medications)
              └── careNames.js (name suggestions)
```

## Architecture Decisions

- **New app `care`, one model `CareRecord` with a category.** Vaccines and treatments share every field; one table means one form, one list and one filter.
- **Due status computed, not stored.** It depends on today's date and on later records, so storing it would go stale. `care/status.py` is a pure function over (records, today), easy to test.
- **"Replaced by a later dose" instead of a "done" flag.** Recording the next dose is what actually happens at the vet; no extra button or field to keep in sync.
- **Status for all of a pet's records is computed once per request** (one light query of category, name, date and id), so the list doesn't query per record.
- **Name suggestions in the frontend** (`careNames.js`), a plain `<datalist>`: no API, no table, free text still allowed.
- **Frontend stays inside `PetProfile`**, like medications and symptoms: `CarePanel` switches between the lists and `CareForm` with local state.

## Task List

### Phase 1: Backend (AC1–AC4, AC6 status)
- [x] Task 1: `care` app, CareRecord model, migration, admin; register in settings, urls, CI and CLAUDE.md
- [x] Task 2: `care/status.py` + CareSerializer (validation, `due_status`, `mine`) + CareViewSet (`?category=`, author-only) + tests

### Checkpoint A
- [x] All backend tests pass; `makemigrations --check` is clean

### Phase 2: Frontend
- [x] Task 3: `careNames.js`, `CareForm` (add / edit / prefilled next dose)
- [x] Task 4: `CarePanel` (coming up, history, filter, delete dialog) on the pet page; drop the "Treatments" placeholder

### Checkpoint B
- [x] Build passes; `npm test` passes
- [x] By hand: add, record next dose, edit, delete, filter; desktop and 390 px

### Phase 3: Finish
- [x] Task 5: CLAUDE.md structure + completed work, todo ticked

### Checkpoint: Complete
- [x] Every Success Criterion in spec.md (1–7) is checked
- [x] Changes left uncommitted for the user (commit with `PET-3: …`)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Same vaccine typed differently ("Rabies" vs "rabies ") keeps two "Coming up" items | Med | Names trimmed; matched case-insensitively; suggestions push towards the same spelling |
| Server date differs from the user's date near midnight | Low | Server uses `Asia/Jerusalem`, the users' time zone |
| US-5 needs a different shape | Low | `next_due` and the record id are all US-5 needs to link a reminder |

## Parallelization

The frontend needs the API, so the work runs in order.

## Open Questions

None. Resolved in spec.md.
