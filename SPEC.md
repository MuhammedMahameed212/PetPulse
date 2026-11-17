# Spec: Pet Profiles (PET-1) — V1

Status: approved (2026-11-17)

## Objective

**User story (translated from the Hebrew original):** As a pet owner, I want to create a personal profile for my pet, so I can keep and manage its personal and medical information in one place.

V1 delivers the **pet profile only**. Medical records, vaccinations, treatments, medications and documents are separate user stories; V1 just gives them a place to live on the profile page.

| # | Acceptance criterion (from the story) | How V1 meets it |
|---|---|---|
| AC1 | The owner can create a new pet profile | "Add a pet" form on the owner dashboard → `POST /api/pets/` |
| AC2 | The profile holds basic details: name, age, breed, weight, photo | Name, species, breed, birth date (age shown, computed from it), weight, photo |
| AC3 | The owner can edit and update the pet's details after creating it | "Edit" on the pet page → `PATCH /api/pets/<id>/` |
| AC4 | Every pet belongs to its owner's account | `Pet.owner` is set from the signed-in user, never from the request body |
| AC5 | The owner can manage more than one pet on the same account | "My pets" list; no limit on the number of pets |
| AC6 | From a saved profile, the owner can reach the pet's medical info, treatments, medications and documents | The pet page shows those four sections as entry points with a "coming in a later release" empty state |

Decisions made with the product owner (2026-11-17):
- **Photos are stored in the database**, shrunk to at most 512 px and re-saved as JPEG. Render's free plan wipes local files on every deploy, and `/media/` isn't served in production.
- **Age is stored as a birth date** (with an "approximate" flag for rescues), and the age is calculated whenever it's shown.
- **Owners can delete a pet,** after confirming.
- **Species is included** (Dog, Cat, Bird, Rabbit, Other). Breed is free text.

## Tech Stack

The existing stack. **No new dependencies.**
- **Backend:** Django 5.2, DRF 3.18, SimpleJWT, Pillow 12.3 (already in `requirements.txt`); SQLite in dev, PostgreSQL on Render.
- **Frontend:** React 18 + Vite 6, no router; plain CSS using the `:root` tokens in `frontend/src/styles.css`.

## Data Model — new app `backend/pets/`

```python
class Pet(models.Model):
    class Species(models.TextChoices):
        DOG = "DOG", "Dog"
        CAT = "CAT", "Cat"
        BIRD = "BIRD", "Bird"
        RABBIT = "RABBIT", "Rabbit"
        OTHER = "OTHER", "Other"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pets")
    name = models.CharField(max_length=60)
    species = models.CharField(max_length=10, choices=Species.choices)
    breed = models.CharField(max_length=80, blank=True)
    birth_date = models.DateField()
    birth_date_is_estimate = models.BooleanField(default=False)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)
    photo = models.BinaryField(null=True, blank=True, editable=False)  # JPEG bytes, ≤512 px
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
```

Validation, enforced in the serializer:
- **`name`:** required; 1–60 characters after trimming.
- **`species`:** required; must be one of the listed choices.
- **`birth_date`:** required; cannot be in the future, and cannot be more than 50 years in the past.
- **`weight_kg`:** required; must be more than 0 and no more than 200.
- **`photo` (optional):**
  - JPEG, PNG or WebP only, and no larger than 5 MB.
  - The file must actually open as an image with Pillow; its extension or declared type is not trusted.
  - Every accepted photo is converted to RGB, resized to fit within 512 × 512 and re-saved as JPEG (quality 82). Re-saving strips EXIF data, which can hold the owner's home GPS location.

## API

Every endpoint requires a signed-in user (JWT), and only `PET_OWNER` users may use them.

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| GET | `/api/pets/` | — | 200, list | Only the caller's own pets, sorted by name |
| POST | `/api/pets/` | multipart form, or JSON when there's no photo | 201, pet | The owner is always the caller |
| GET | `/api/pets/<id>/` | — | 200, pet | |
| PATCH | `/api/pets/<id>/` | multipart or JSON, any subset of fields | 200, pet | Sending `remove_photo=true` clears the photo |
| DELETE | `/api/pets/<id>/` | — | 204 | Permanent |

What a pet looks like in responses:
```json
{
  "id": 7,
  "name": "Milo",
  "species": "DOG",
  "breed": "Golden retriever",
  "birth_date": "2024-07-02",
  "birth_date_is_estimate": false,
  "weight_kg": "28.40",
  "photo": "data:image/jpeg;base64,/9j/4AAQ...",
  "created_at": "2026-11-17T09:12:00Z",
  "updated_at": "2026-11-17T09:12:00Z"
}
```
`photo` is a data URL, or `null` when there's no photo. A data URL is used because an `<img>` tag can't send the Bearer token that a separate photo endpoint would need.

Error responses:

| Status | When |
|---|---|
| 400 | A field is invalid. The body uses DRF's usual `{field: [messages]}` format, which `apiFetch` already displays. |
| 401 | The caller isn't signed in. |
| 403 | The caller is a vet. Vet access to pets comes with the sharing and vet stories. |
| 404 | The pet doesn't exist, **or it belongs to another owner**. Answering 404 rather than 403 hides that the pet exists. |

## Frontend

`OwnerDashboard` keeps its sidebar and mobile tab bar. **Home** becomes **My pets**, and screens are switched with component state, not a router.

1. **My pets list:** one card per pet, showing the photo (or the species initial in a coloured circle), name, species and breed, and age.
   - Clicking a card opens that pet.
   - An "Add a pet" button opens the form.
   - When there are no pets, an empty state explains what to do and shows the "Add a pet" button.
2. **Pet form** (shared by "Add a pet" and "Edit"):
   - Fields: name, species, breed, birth date with an "Approximate date" checkbox, weight in kg, and a photo picker with preview and a remove option.
   - Labels are linked to their inputs (`htmlFor`/`id`).
   - Errors are shown next to the form.
   - The save button reads "Save pet" and changes to "Saving…" while it works.
3. **Pet page:**
   - A header with the photo, name, species, breed, age (for example "2 yrs 4 mos", or "about 3 yrs" when the date is approximate) and weight.
   - "Edit" and "Delete" actions. Delete opens a confirmation dialog that names the pet; on success it returns to the list.
   - Four entry-point sections: **Medical file, Treatments, Medications, Documents.** Each shows "Coming in a later release" (AC6).

`frontend/src/api.js`: `apiFetch` must not set `Content-Type` when the body is a `FormData`. The browser has to add the multipart boundary itself. This is a one-line change.

## Commands

```
Backend tests:  .venv/bin/python backend/manage.py test petpulse_core accounts pets --verbosity=1
Backend check:  .venv/bin/python backend/manage.py check
Migrations:     .venv/bin/python backend/manage.py makemigrations pets
Frontend build: cd frontend && npm run build
Dev servers:    .venv/bin/python backend/manage.py runserver   +   cd frontend && npm run dev
```
CI (`.github/workflows/CICD.yml`) runs the backend test step; it needs `pets` added to the list of apps it tests.

## Project Structure

```
backend/pets/                     → New Django app
  models.py                       → Pet
  serializers.py                  → PetSerializer (validation + photo processing)
  views.py                        → PetViewSet (owner-scoped queryset, IsPetOwner permission)
  urls.py                         → DRF router mounted at /api/pets/
  admin.py                        → PetAdmin (list: name, species, owner)
  tests.py                        → API tests (see Testing Strategy)
  migrations/0001_initial.py
backend/petpulse_core/settings.py → add "pets" to INSTALLED_APPS
backend/petpulse_core/urls.py     → path("api/pets/", include("pets.urls"))
frontend/src/api.js               → FormData support in apiFetch
frontend/src/components/
  OwnerDashboard.jsx              → "My pets" tab + switching between list, form and pet page
  PetList.jsx, PetForm.jsx, PetProfile.jsx → New components
frontend/src/styles.css           → Styles for the new components, using the existing tokens
```

## Code Style

Follow the existing `accounts` app: DRF generic views and viewsets, serializers do the validation, and docstrings name the user story. In the frontend: function components, `useState`, `apiFetch`, and sentence-case copy without emoji.

```python
class PetViewSet(viewsets.ModelViewSet):
    """US-1: Pet owners create and manage profiles for their own pets."""

    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return Pet.objects.filter(owner=self.request.user)  # other owners' pets → 404

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
```

## Testing Strategy

- **Backend:** Django `TestCase` with `APIClient` in `backend/pets/tests.py`. These are the required tests; they make up the definition of done.
  - **Creating:** an owner creates a pet with and without a photo; the response matches the shape above and the owner is the caller. If `owner` is sent in the body, it is ignored.
  - **Listing:** an owner sees only their own pets, including when they have several (AC4, AC5).
  - **Editing:** a PATCH updates the given fields only; `remove_photo=true` clears the photo.
  - **Deleting:** the owner gets 204; a later GET returns 404.
  - **Isolation:** owner B gets 404 when they GET, PATCH or DELETE owner A's pet.
  - **Roles:** a vet gets 403 and an anonymous caller gets 401, on both the list and a single pet.
  - **Validation:** each of these returns 400 — a birth date in the future, a weight of 0, a weight of 250, an empty name, an unknown species, a file that isn't an image, and an image over 5 MB.
  - **Photo handling:** an uploaded 2000 × 1500 PNG that carries EXIF data comes back as a JPEG of at most 512 px, with no EXIF.
- **Frontend:** the project has no frontend test setup, and adding Vitest counts as "Ask first". Instead the UI is checked by hand against the Success Criteria, with screenshots at desktop and 390 px width.

## Boundaries

- **Always:**
  - Scope every query to `request.user`.
  - Re-encode uploaded images.
  - Run the backend tests and the frontend build before committing.
  - Include the Jira key in commit messages.
  - Keep the existing routing by role (owners to `OwnerDashboard`, vets to `VetDashboard`).
- **Ask first:**
  - Adding any dependency (Vitest, a router, cloud storage).
  - Changing the `accounts` models.
  - Changing CI beyond adding `pets` to the test command.
  - Serving `/media/`.
- **Never:**
  - Trust an `owner` or `id` sent by the client.
  - Return another owner's pet.
  - Store the original uploaded file or its EXIF data.
  - Commit `db.sqlite3` or any media files.

## Success Criteria

1. All tests in `backend/pets/tests.py` pass, and the existing `petpulse_core` and `accounts` tests still pass.
2. An owner can add two pets, see both in "My pets", open one, edit its weight and photo, and see the change after a page reload. This is checked by hand in the browser.
3. Deleting a pet asks for confirmation, removes it from the list, and leaves the other pet untouched.
4. A vet account never sees the pets screens, and a vet calling `/api/pets/` gets 403.
5. A stored photo is at most 512 px, a JPEG, and carries no EXIF.
6. The pet page shows the four entry-point sections (AC6).
7. The pet screens work at 390 px width with no horizontal scrolling, every form field has a linked label, and keyboard focus is visible.
8. `npm run build` passes, and the 3D bundle is still loaded only by the landing page.

## Out of Scope (Deferred)

- **Medical file, vaccinations, treatments, medications and documents:** each is its own user story; V1 only provides their entry points.
- **Weight history:** V1 stores only the current weight; the history belongs to the weight/symptom tracker story.
- **Sharing a pet with a co-owner or sitter, and vet access to pets:** Milestone 3 and Milestone 4 stories.
- **More than one photo, and photo cropping:** not needed for a profile.
- **A breed list:** free text is enough for V1.
- **Moving photos to object storage:** only worth it if the database grows too large or more media types arrive.
- **Sex, neutered status, microchip number:** useful to vets, but deferred by the product owner (2026-11-17).
- **HEIC uploads:** Safari usually converts iPhone photos to JPEG on upload; reading HEIC directly needs a new dependency.
- **Frontend unit tests:** these need Vitest, which is a new dependency (Ask first).

## Resolved Questions

1. Jira key: **PET-1**. Every commit for this spec references it.
2. Sex, neutered status and microchip number are deferred (see Out of Scope).
3. HEIC uploads are skipped (see Out of Scope).
