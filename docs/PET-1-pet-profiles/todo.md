# Tasks: Pet Profiles (PET-1) — V1

Spec: `spec.md` · Plan: `plan.md`
Backend tests: `.venv/bin/python backend/manage.py test petpulse_core accounts pets --verbosity=1`
Build: `cd frontend && npm run build`

## Task 1: Pet model and create/list/retrieve API, with tests

**Description:** Create the `pets` app with the `Pet` model from the spec, its migration, an admin entry, `PetSerializer` (every validation rule except the photo), `IsPetOwner`, and `PetViewSet` limited to GET and POST at `/api/pets/`. Write the tests first.

**Acceptance criteria:**
- [x] `POST /api/pets/` creates a pet owned by the caller; an `owner` sent in the body is ignored. Returns 201 with the spec's response shape (`photo: null`)
- [x] `GET /api/pets/` returns only the caller's pets, sorted by name; `GET /api/pets/<id>/` returns 404 for another owner's pet
- [x] A vet gets 403 and an anonymous caller gets 401; invalid input gets 400 (future or more than 50-year-old birth date, weight ≤ 0 or > 200, blank name, unknown species)

**Verification:**
- [x] Tests pass: `.venv/bin/python backend/manage.py test pets accounts petpulse_core`
- [x] `.venv/bin/python backend/manage.py makemigrations --check --dry-run` is clean

**Dependencies:** None

**Files likely touched:** `backend/pets/{__init__,apps,models,serializers,permissions,views,urls,admin,tests}.py`, `backend/pets/migrations/0001_initial.py`, `backend/petpulse_core/settings.py`, `backend/petpulse_core/urls.py`

**Estimated scope:** M. Many files, but most are short app boilerplate; the real logic is in the serializer, views and tests.

## Task 2: "My pets" list and "Add a pet" form

**Description:** On `OwnerDashboard`, rename the "Home" tab to "My pets". It shows `PetList`: cards with a species initial in place of a photo, name, species and breed, and age; or an empty state when there are no pets. Add `PetForm` in add mode, without a photo field yet, and a small `petAge()` helper.

**Acceptance criteria:**
- [x] Adding a pet through the form shows it in the list without reloading; server validation errors appear above the form
- [x] With no pets, the empty state explains what to do and offers "Add a pet"
- [x] Every input has a linked label (`htmlFor`/`id`); the form works at 390 px width

**Verification:**
- [x] Build passes: `cd frontend && npm run build`
- [x] By hand (screenshots): empty state → add Milo and Luna → both listed, ages correct

**Dependencies:** Task 1

**Files likely touched:** `frontend/src/components/OwnerDashboard.jsx`, `PetList.jsx` (new), `PetForm.jsx` (new), `frontend/src/styles.css`

**Estimated scope:** M

## Checkpoint A
- [x] All backend tests pass; the build passes
- [x] Owner adds 2 pets end to end; a vet account still lands on `VetDashboard` and gets 403 from `/api/pets/`

## Task 3: Edit and delete API, with tests

**Description:** Allow PATCH and DELETE on `PetViewSet`.

**Acceptance criteria:**
- [x] PATCH changes only the fields sent, with the same validation as create; returns 200
- [x] DELETE returns 204, and a later GET returns 404
- [x] Owner B gets 404 when they PATCH or DELETE owner A's pet; a vet gets 403

**Verification:**
- [x] Tests pass: `.venv/bin/python backend/manage.py test pets`

**Dependencies:** Task 1

**Files likely touched:** `backend/pets/views.py`, `backend/pets/tests.py`

**Estimated scope:** S

## Task 4: Pet page with Edit, Delete and entry points

**Description:** Add `PetProfile`: a header with the name, species and breed, age ("about …" when the date is approximate) and weight; "Edit", which opens `PetForm` in edit mode; and "Delete", which opens a confirmation dialog naming the pet and returns to the list when done. Add the four entry-point sections from AC6 (Medical file, Treatments, Medications, Documents), each showing "Coming in a later release". Add a back link to "My pets".

**Acceptance criteria:**
- [x] An edit is saved and visible after a reload; "Cancel" discards it
- [x] Delete asks first (focus moves into the dialog, Escape cancels); after confirming, the pet is gone from the list
- [x] The four entry-point sections appear on every pet page

**Verification:**
- [x] Build passes
- [x] By hand (screenshots): open Milo → edit weight → reload → kept; delete Luna → Milo remains

**Dependencies:** Tasks 2 and 3

**Files likely touched:** `frontend/src/components/PetProfile.jsx` (new), `PetForm.jsx`, `OwnerDashboard.jsx`, `frontend/src/styles.css`

**Estimated scope:** M

## Checkpoint B
- [x] All tests pass; the build passes
- [x] AC1–AC6 work end to end, except photos

## Task 5: Photo upload and processing in the API, with tests

**Description:** Accept `photo` as multipart on POST and PATCH, and `remove_photo=true` on PATCH. Check type and size, then process it: exif_transpose → RGB → fit within 512 px → JPEG q82. Return `photo` as a data URL.

**Acceptance criteria:**
- [x] A 2000 × 1500 PNG with EXIF data and transparency comes back as a JPEG data URL of at most 512 px with no EXIF
- [x] A file that isn't an image, or one over 5 MB, gets 400; `remove_photo=true` sets `photo` to null
- [x] JSON requests without a photo still work, unchanged

**Verification:**
- [x] Tests pass: `.venv/bin/python backend/manage.py test pets`

**Dependencies:** Task 3

**Files likely touched:** `backend/pets/serializers.py`, `backend/pets/views.py`, `backend/pets/tests.py`

**Estimated scope:** S

## Task 6: Photos in the UI

**Description:** `apiFetch` skips `Content-Type` when the body is a `FormData`. `PetForm` gets a photo picker with a preview and "Remove photo", and sends FormData only when a photo was picked or removed. The list and pet page show the photo, or fall back to the species initial.

**Acceptance criteria:**
- [x] Picking a photo shows a preview before saving; after saving, the photo appears in the list and on the pet page
- [x] "Remove photo" brings back the species initial; editing other fields keeps the existing photo
- [x] Existing JSON calls (login, register, change password) still work

**Verification:**
- [x] Build passes; backend tests pass
- [x] By hand (screenshots): upload a phone photo → shown upright and sharp; remove it; sign in still works

**Dependencies:** Tasks 4 and 5

**Files likely touched:** `frontend/src/api.js`, `PetForm.jsx`, `PetList.jsx`, `PetProfile.jsx`, `frontend/src/styles.css`

**Estimated scope:** M

## Task 7: CI, polish and project notes

**Description:** Add `pets` to the CI test command. Do a responsive and accessibility pass on the pet screens: 390 px width, keyboard-only use, visible focus. Update `Claude.yml` (repository structure and completed work).

**Acceptance criteria:**
- [x] The CI test step runs `petpulse_core accounts pets`
- [x] No horizontal scrolling at 390 px; every action can be reached with the keyboard
- [x] `Claude.yml` describes the `pets` app and its endpoints

**Verification:**
- [x] Full test run passes; build passes; `makemigrations --check` is clean
- [x] Screenshots of every pet screen at desktop and 390 px width

**Dependencies:** Task 6

**Files likely touched:** `.github/workflows/CICD.yml`, `Claude.yml`, `frontend/src/styles.css`

**Estimated scope:** S

## Checkpoint: Complete
- [x] spec.md Success Criteria 1–8 all checked
- [ ] Human review → commit `PET-1: …` on a feature branch
