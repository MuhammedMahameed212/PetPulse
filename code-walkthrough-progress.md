# PetPulse code walkthrough — progress

The user is learning the codebase lesson by lesson. Each lesson goes through the files line by line and ends with "check yourself" questions.

## Curriculum
1. ✅ Big picture + models — `accounts/models.py`, `pets/models.py`
2. ✅ Serializers — `pets/serializers.py`, `accounts/serializers.py` (User + Register)
3. ✅ Views, URLs, permissions — `pets/views.py`, `pets/urls.py`, `permissions.py`, `access.py`, `admin.py`, core `urls.py`
4. ✅ Authentication — `accounts/views.py`, `accounts/urls.py`, password reset/change serializers, JWT settings (taught; questions not answered yet)
5. ⏭ Medications & dose logs (PET-4) — `medications/*`
6. Settings, deployment, CI/CD — `settings.py`, `render.yaml`, `build.sh`, `.github/workflows/CICD.yml`
7. Frontend basics — `main.jsx`, `App.jsx`, `api.js`
8. Frontend screens — AuthPage, OwnerDashboard, PetForm, PetProfile, MedicationsPanel, MedicationForm, VetDashboard, password pages, `petAge.js`
9. Tests — the `tests.py` files, `petAge.test.js`

## Where to resume (session 2)
Lesson 4's check-yourself questions are still open:
1. Why can't someone edit `user_id` in a JWT payload? (the signature uses SECRET_KEY)
2. Why does the reset-request endpoint give the same answer every time? Which other endpoint does this? (user enumeration; Login)
3. Why does a used reset link fail? (the token depends on the password hash)
4. Why pass `context={"request": request}` to ChangePasswordSerializer?
5. Does an access token still work after logout? (yes, until it expires, up to 12h; there's no blacklist)

Then Lesson 5.

## Concepts the user found hard (reinforce these)
- `validate()` vs `validate_<field>()`: rules that involve several fields need `validate()`.
- DRY / why `accessible_pets` is its own function in its own file.
- The code limits behaviour: PUT isn't in `http_method_names`, so the API returns 405.
- Python is case-sensitive (`IsPetOwner`), and type hints must name real types (`value: str`).
