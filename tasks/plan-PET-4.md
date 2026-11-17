# Implementation Plan: Medications and Dose Tracking (PET-4) — V1

Source spec: `SPEC-PET-4.md` (approved 2026-11-17)
Task list: `tasks/todo-PET-4.md`. Jira tracks the story as a whole (PET-4).

## Overview

Owners add medicines to a pet (daily at set times, or as needed) and tick off today's doses; each tick stores when and by whom. Built in two vertical slices: "manage medicines" (model + API + screens), then "tick today's doses" (dose model + API + ticks). Vet access and the history screen come in later stories.

## Dependency Graph

```
pets.access.accessible_pets(user)        (PetViewSet switches to it too: one access rule)
  └── Medication model + MedicationViewSet  /api/pets/<pet_id>/medications/
        ├── MedicationsPanel + MedicationForm on the pet page (replaces the "Medications" card)
        └── DoseLog model + mark / undo        …/medications/<id>/doses/
              └── `today` slots in the medication list
                    └── Today's doses: tick, undo, "Log a dose"
```

## Architecture Decisions

- **New app `medications`.** Medicines and their doses are their own domain. Later stories (history, reminders) build on it without touching `pets`.
- **One access rule, `pets/access.py: accessible_pets(user)`.** It returns the owner's pets now. `PetViewSet` and the medication views both use it, so PET-21 changes one function to let vets in. Pets the caller can't access answer 404 automatically.
- **Nested routes under the pet** (`/api/pets/<pet_id>/medications/…`), included in `petpulse_core/urls.py` next to `api/pets/`. The view loads the pet through `accessible_pets` once, and the URL decides `pet`, never the body.
- **`dose_times` as a JSON list of "HH:MM".** One to six times per medicine don't justify a table. Validated, deduplicated and sorted in the serializer.
- **The server decides the dose date (today, `timezone.localdate()`).** Since only today's doses can be ticked, the client sends just the time, so it can't tick another day.
- **A conditional unique constraint** on (medication, scheduled_date, scheduled_time) when time is set. This stops double ticks even when two requests race; the API turns the conflict into a 400 "Already marked as given".
- **`today` is computed in the list serializer** from the medication's `dose_times` and today's doses (one prefetch, no query per medicine).
- **The frontend keeps all medicine screens inside `PetProfile`.** `MedicationsPanel` switches between the list and `MedicationForm` with local state, so `OwnerDashboard` stays unchanged. No router.

## Task List

### Phase 1: Manage medicines (AC1, AC2, AC7 hook)
- [x] Task 1: `accessible_pets`, Medication model and CRUD API, with tests
- [x] Task 2: Medications section on the pet page: list, add/edit form, delete with confirmation

### Checkpoint A
- [x] All backend tests pass (pets still pass after switching to `accessible_pets`); the build passes; `makemigrations --check` is clean
- [x] By hand: add a daily medicine with 2 times and an as-needed one; edit; delete asks first

### Phase 2: Tick today's doses (AC4, AC5)
- [x] Task 3: DoseLog model, mark and undo API, `today` slots, with tests
- [x] Task 4: Today's doses on the pet page: tick, "Given 08:04 by Noa", Undo, "Log a dose"

### Checkpoint B
- [x] All tests pass; the build passes
- [x] By hand: tick → reload → kept; second tick of the same dose refused; undo own; ended medicine shows no ticks

### Phase 3: Finish
- [x] Task 5: `medications` in CI, 390 px and keyboard pass, project notes

### Checkpoint: Complete
- [x] Every Success Criterion in SPEC-PET-4.md (1–8) is checked
- [x] Changes left uncommitted for the user (commit with `PET-4: …`)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Two people tick the same dose at once | Med | DB unique constraint, not only a check in code; tested |
| "Today" differs between server and browser near midnight | Low | The server decides the date (Asia/Jerusalem); the screen shows what the server returns |
| Changing `PetViewSet` to `accessible_pets` breaks PET-1 | Med | Same filter as before; the 18 pets tests must still pass |
| Editing dose times leaves a tick for a time that no longer exists | Low | Ticks keep their own time; `today` lists current times plus any of today's ticks at other times, so nothing disappears |
| `JSONField` behaves differently on SQLite and Postgres | Low | Only stored and read whole, never queried inside |

## Parallelization

Each frontend task needs its backend API, so the work runs in order.

## Open Questions

None. All were resolved in SPEC-PET-4.md.
