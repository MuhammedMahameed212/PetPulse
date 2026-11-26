# Spec: Symptom Log and Health Changes (PET-6) — V1

Status: approved (2026-11-23)
Jira: PET-6 (US-6), Milestone 2 (PET-25)
Branch: `PET-6-US-6-תיעוד-תסמינים-ומעקב-אחר-מצב-החיה`
Depends on: PET-1 (Pet model, pet page, `process_photo`) and PET-4 (`accessible_pets`, nested-app pattern).

## Objective

Owners record symptoms and changes in their pet's health (what happened, when, how bad, with photos or a short video) and see the history over time, so they can follow how a problem develops and show it to the vet.

User story (US-6): As a pet owner, I want to record symptoms and changes in my pet's health, so I can follow how they develop and show relevant information to the vet when needed.

| AC | Acceptance criterion | How V1 meets it |
|----|---------------------|-----------------|
| AC1 | Add a new record of a symptom or change in the pet's condition | "Add symptom" on the pet's Symptoms section |
| AC2 | Each record stores a date, description and notes | Date **and time**, description, notes. Also **severity** (Mild / Moderate / Severe) and **status** (Ongoing / Resolved) |
| AC3 | Attach a photo or video | Up to **3 files** per record: JPEG/PNG/WebP photos, and at most **one** short MP4/MOV/WebM video (≤ 10 MB) |
| AC4 | View the symptom history over time | Newest first, with a filter: All / Ongoing / Resolved |
| AC5 | Edit or delete an existing record | Edit (including adding and removing files) and delete with confirmation, **only by the user who created the record** |
| AC6 | Vets and clinic staff can view the records, by permission | **Depends on PET-21 (sharing).** All access goes through `accessible_pets(user)`, which PET-21 extends to vets. In V1 vets get 403 |
| AC7 | Records are part of the pet's medical information | Stored under the pet (`/api/pets/<pet_id>/symptoms/`), deleted with the pet, shown on the pet page |

## Data Model

New app `backend/symptoms/`.

**SymptomLog**

| Field | Type | Rules |
|-------|------|-------|
| `pet` | FK → `pets.Pet`, CASCADE, `related_name="symptoms"` | set from the URL, never from the body |
| `occurred_at` | DateTime | required; when it was noticed; not in the future |
| `description` | Char(200) | required, trimmed; e.g. "Limping on the front left leg" |
| `notes` | Text, max 2000, blank | free text: context, what was tried |
| `severity` | Char choices `MILD` / `MODERATE` / `SEVERE` | required, default `MILD` |
| `status` | Char choices `ONGOING` / `RESOLVED` | required, default `ONGOING` |
| `created_by` | FK → User, SET_NULL, nullable | the caller |
| `created_at`, `updated_at` | DateTime | automatic |

Ordering: newest `occurred_at` first.

**SymptomAttachment** (one row = one file)

| Field | Type | Rules |
|-------|------|-------|
| `symptom` | FK → SymptomLog, CASCADE, `related_name="attachments"` | from the URL |
| `kind` | Char choices `IMAGE` / `VIDEO` | set by the server from the file's content |
| `content_type` | Char(40) | `image/jpeg`, `video/mp4`, `video/quicktime` or `video/webm` |
| `data` | Binary | the file bytes |
| `size` | PositiveInteger | bytes, for the screen |
| `created_at` | DateTime | automatic |

**File rules**
- At most 3 files per record, and at most 1 video.
- Photos: JPEG, PNG or WebP, ≤ 5 MB uploaded. Re-encoded like the pet photo (`process_photo`): upright, EXIF/GPS stripped, but up to **1280 px** so the vet can see detail.
- Videos: MP4/MOV (checked by the `ftyp` header) or WebM (EBML header), ≤ 10 MB. Stored as uploaded; no transcoding (no ffmpeg dependency). Length is not checked; 10 MB is roughly 20–30 seconds of phone video.
- Why the database: Render's free disk is wiped on every deploy, so files on disk would vanish. The free Postgres has 1 GB, which is enough for a student project with these limits (see Risks in plan.md).

## API

All endpoints need a signed-in pet owner. A pet the caller can't access answers 404, vets get 403 (until PET-21), signed-out users 401.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/pets/<pet_id>/symptoms/` | history, newest first; `?status=ONGOING` or `RESOLVED` filters |
| POST | `/api/pets/<pet_id>/symptoms/` | add (201), JSON |
| GET / PATCH / DELETE | `/api/pets/<pet_id>/symptoms/<id>/` | view, edit, delete (deletes its files) |
| POST | `/api/pets/<pet_id>/symptoms/<id>/attachments/` | upload **one** file (multipart field `file`); 201 |
| GET | `/api/pets/<pet_id>/symptoms/<id>/attachments/<att_id>/` | the file's bytes with its content type |
| DELETE | `/api/pets/<pet_id>/symptoms/<id>/attachments/<att_id>/` | remove a file; 204 |

Only the user who created a record can edit it, delete it, or add and remove its files; anyone else who can see the pet gets 403 (this matters once PET-21 adds shared owners). The response has `mine: true|false` so the screen shows Edit and Delete only on your own records.

Files go one per request, so each request stays small (≤ 10 MB) and a failed upload doesn't lose the record. The list returns file metadata only, not the bytes, so the history stays fast.

Record response:

```json
{
  "id": 12, "occurred_at": "2026-11-22T19:30:00+02:00",
  "description": "Limping on the front left leg", "notes": "Started after the park",
  "severity": "MODERATE", "status": "ONGOING", "created_by": "Noa", "mine": true,
  "attachments": [
    { "id": 5, "kind": "IMAGE", "content_type": "image/jpeg", "size": 184211 },
    { "id": 6, "kind": "VIDEO", "content_type": "video/mp4", "size": 7340032 }
  ],
  "created_at": "...", "updated_at": "..."
}
```

`created_by` is the user's first name, or the username when it is empty (same as `given_by` in PET-4).

## Frontend

A new Symptoms section on the pet page, below Medications:

- **Symptoms section on the pet page (`SymptomsPanel`):**
  - Filter: All / Ongoing / Resolved.
  - Each record: date and time, description, severity badge, status, notes, thumbnails of its files; Edit and Delete.
  - "Mark resolved" / "Reopen" shortcut on each record.
  - Edit, Delete and the shortcut show only on your own records (`mine`).
- **Add / edit form (`SymptomForm`):** date and time (default now), description, severity, status, notes, files (up to 3, one video), with a preview and "Remove" per file; linked labels; works at 390 px.
- **Showing files (`AttachmentView`):** an `<img>` or `<video>` can't send the Bearer token, so the screen fetches the file through `api.js` and shows it from a blob URL (freed when the component unmounts).
- Delete asks for confirmation in the same `<dialog>` style as deleting a pet or medicine.

## Tech Stack

Unchanged: Django 5.2 + DRF 3.18 + Pillow, React 18 + Vite 6. No new dependencies.

## Commands

```
Backend tests: .venv/bin/python backend/manage.py test petpulse_core accounts pets medications symptoms --verbosity=1
Migrations:    .venv/bin/python backend/manage.py makemigrations --check --dry-run
Build:         cd frontend && npm run build
Frontend unit: cd frontend && npm test
```

Add `symptoms` to `INSTALLED_APPS`, the test step in `.github/workflows/CICD.yml`, and the `backend_tests` / `backend_coverage` commands in `CLAUDE.md`.

## Project Structure

```
backend/symptoms/                        new app: models, serializers, media (file checks), views, urls, admin, tests, migration
backend/pets/serializers.py              process_photo gets a size parameter (default unchanged: 512 px)
backend/petpulse_core/{settings,urls}.py register the app and its routes
frontend/src/components/SymptomsPanel.jsx    history + filter (on the pet page)
frontend/src/components/SymptomForm.jsx      add / edit, with file picker
frontend/src/components/AttachmentView.jsx   fetch a file with the token and show it
frontend/src/components/PetProfile.jsx       shows the Symptoms section
frontend/src/petAge.js                       localDateTime / showDateTime helpers (tested in petAge.test.js)
```

## Code Style

Same as `medications`: the pet is loaded through `accessible_pets` (others' pets answer 404), validation lives in the serializer, file checks in their own small module (`symptoms/media.py`), and tests are named after the story and criterion.

## Testing Strategy

Django `TestCase` in `backend/symptoms/tests.py`:
- Create, list, edit and delete a record; validation: missing description, future date, bad severity/status.
- History: newest first; `?status=` filter.
- Files: upload a photo (re-encoded, EXIF stripped, ≤ 1280 px), upload a video (MP4 and WebM headers), refuse a 4th file, a 2nd video, an oversized file, and a non-media file renamed `.mp4`; download returns the bytes and content type; delete a file; deleting the record deletes its files.
- Access: other owners get 404 on every endpoint (including file download), vets 403, anonymous 401.

The browser flow is checked by hand at desktop and 390 px.

## Boundaries

- **Always:** run backend tests and the build before calling a task done; PET-6 in commit messages (the user commits); keep all access checks in `accessible_pets`.
- **Ask first:** new dependencies (e.g. ffmpeg, cloud storage); changes to the `Pet` model; raising the file limits.
- **Never:** commit or push; trust `pet`, `created_by`, `kind` or `content_type` from the request; store files on disk.

## Success Criteria

1. An owner adds a record with date and time, description, severity, notes, two photos and a short video; it appears at the top of the history.
2. The photos and the video show on the pet page and are kept after a reload.
3. A 4th file, a 2nd video, a file over the limit and a non-media file are refused with a clear message.
4. Editing a record changes it; files can be added and removed; marking it resolved moves it under "Resolved".
5. Deleting a record asks first and removes its files.
6. The history is newest first and the filter works.
7. Other owners get 404, vets 403 and signed-out users 401 on every endpoint.
8. All tests pass (including `symptoms` in CI), the build passes, and the migration is included in the changes.

## Out of Scope (Deferred)

- **Vet and clinic access** (AC6): PET-21 extends `accessible_pets`.
- **Video transcoding, length checks, or cloud storage.**
- **Charts or trends** (e.g. weight over time).
- **Linking a symptom to a medicine or a vet visit.**
- **Export to PDF for the vet:** PET-9 (summary export).

## Resolved Questions

1. Storage: photos and short videos in the database (Render's disk is not kept).
2. Files per record: up to 3, at most one video.
3. Extra fields: time, severity, status.
4. Vet access: deferred to PET-21, through `accessible_pets`.
5. Video length: not checked; the 10 MB limit is enough (no ffmpeg).
6. Edit and delete: only the user who created the record.
