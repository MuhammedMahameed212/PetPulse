# Implementation Plan: Pet Profiles (PET-1) — V1

Source spec: `SPEC.md` (approved 2026-11-17)
Task list: `tasks/todo.md`. Jira tracks the story as a whole (PET-1); the tasks below are not separate Jira issues.

## Overview

Owners create, view, edit and delete profiles for their pets, with an optional photo, from a "My pets" area of the owner dashboard. The work is built as vertical slices: each slice adds a backend endpoint, its tests and the screen that uses it, so the app works end to end after every slice.

## Dependency Graph

```
Pet model + migration
  └── PetSerializer (validation)
        └── PetViewSet + IsPetOwner + /api/pets/ routes
              ├── create/list/retrieve ── My pets list + Add-pet form
              ├── update/delete ───────── Pet page (edit, delete, AC6 entry points)
              └── photo processing ────── Photo picker + apiFetch FormData support
CI test command (needs pets/tests.py to exist)
```

## Architecture Decisions

- **One new app, `backend/pets/`.** Pets are their own domain, and later stories (vaccines, medications, documents) will point to `Pet`, not to `User`.
- **A `ModelViewSet` filtered to the caller's pets, plus an `IsPetOwner` permission.** Filtering in `get_queryset` makes other owners' pets answer 404 without extra code. The permission class answers 403 for vets.
- **Photos are stored as JPEG bytes in a `BinaryField` and returned as a data URL.** This avoids Render's file wipe on deploy and the fact that an `<img>` tag can't send a Bearer token. A 512 px JPEG is about 30–60 KB, and a "My pets" list holds a handful of pets.
- **The photo is processed in the serializer:** opened with Pillow, checked, converted to RGB, resized to fit 512 px and re-saved as JPEG at quality 82. Re-saving drops EXIF data. Doing this in one place means create and edit share it.
- **No router.** `OwnerDashboard` keeps a small piece of state (`view: list | add | pet | edit` plus `petId`), as the app does today. A router would be a new dependency (Ask first).
- **One shared `PetForm`** for adding and editing.

## Task List

### Phase 1: Add and list pets (AC1, AC2 without the photo, AC4, AC5)
- [x] Task 1: Pet model and create/list/retrieve API, with tests
- [x] Task 2: "My pets" list and "Add a pet" form on the owner dashboard

### Checkpoint A
- [x] Backend tests pass; the migration is committed; `makemigrations --check` is clean
- [x] By hand: sign in as an owner → add 2 pets → both appear in the list; a vet sees no pets screens

### Phase 2: Pet page, edit, delete (AC3, AC6)
- [x] Task 3: Edit and delete API, with tests
- [x] Task 4: Pet page with Edit, Delete-with-confirmation and the four entry-point sections

### Checkpoint B
- [x] Backend tests pass; the build passes
- [x] By hand: open a pet → edit its weight → reload → the change is kept; delete one pet → the other remains

### Phase 3: Photos (AC2 complete)
- [x] Task 5: Photo upload and processing in the API, with tests
- [ ] Task 6: Photo picker in the form; photo on the list and the pet page; FormData support in `apiFetch`

### Phase 4: Ship
- [ ] Task 7: Add `pets` to CI; responsive and accessibility pass; update the project notes

### Checkpoint: Complete
- [ ] Every Success Criterion in SPEC.md (1–8) is checked
- [ ] Screenshots at desktop and 390 px width are reviewed
- [ ] Ready for review and commit (`PET-1: …`)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| A photo bomb (a tiny file that expands into a huge image) | High | Pillow's built-in pixel-count limit stays on; files over 5 MB are rejected before decoding; `Image.verify()` is followed by a fresh `open()` |
| A big list response once photos are included | Med | Photos are capped at 512 px JPEG q82 (about 50 KB each). Revisit if owners have more than about 20 pets (deferred) |
| PNG/WebP with transparency, or 16-bit modes, fail to save as JPEG | Med | Always `convert("RGB")`; the tests cover a PNG with transparency |
| A phone photo appears sideways once EXIF is stripped | Med | Apply `ImageOps.exif_transpose()` before resizing |
| `apiFetch` forcing a JSON `Content-Type` breaks multipart uploads | Med | Skip the header when the body is a `FormData`; covered by the photo upload check |
| CI coverage drops because `pets` isn't in the test command | Low | Task 7 adds it; until then it's run locally with `pets` |
| Dates shift across time zones | Low | `birth_date` is a plain date. Age is worked out from local date parts in the browser, never through `new Date("YYYY-MM-DD")`, which reads the date as UTC |

## Parallelization

The frontend task in each phase depends on the matching backend task's API, so the work runs in order. Only the CI change in Task 7 could run alongside anything.

## Open Questions

None. All were resolved in SPEC.md.
