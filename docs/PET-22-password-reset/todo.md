# Tasks: Password Reset (PET-22) — V1

Spec: `spec.md` · Plan: `plan.md`
Backend tests: `.venv/bin/python backend/manage.py test petpulse_core accounts --verbosity=1`
Build: `cd frontend && npm run build`
Commits: none by Claude; the user reviews and commits (`PET-22: …`).

## Task 1: Email settings and the "send reset link" API, with tests

**Description:** Add the email settings from the spec (`EMAIL_BACKEND` defaulting to console, SMTP values, `DEFAULT_FROM_EMAIL`, `FRONTEND_URL`), `PASSWORD_RESET_TIMEOUT = 3600` and the `password_reset: 5/hour` throttle rate. Add `PasswordResetRequestSerializer` and `PasswordResetRequestView` at `POST /api/auth/password-reset/`. Write the tests first.

**Acceptance criteria:**
- [x] A registered email (any letter case) sends one plain-text email whose link is `FRONTEND_URL/reset-password?uid=…&token=…`; the answer is 200 with the generic message
- [x] An unknown email and an inactive user get the same 200 answer and no email; an empty or malformed email gets 400
- [x] The 6th request within an hour gets 429

**Verification:**
- [x] Tests pass: `.venv/bin/python backend/manage.py test accounts`
- [x] `makemigrations --check --dry-run` is clean

**Dependencies:** None

**Files likely touched:** `backend/petpulse_core/settings.py`, `backend/accounts/serializers.py`, `backend/accounts/views.py`, `backend/accounts/urls.py`, `backend/accounts/tests.py`

**Estimated scope:** M

## Task 2: "Forgot password?" on the sign-in page

**Description:** In `AuthPage`, sign-in mode shows a "Forgot password?" link that switches to a new `"forgot"` mode: an email field, "Send reset link" and "Back to sign in". After sending, the generic message replaces the form.

**Acceptance criteria:**
- [x] The link appears only in sign-in mode, and the forgot form works with the keyboard
- [x] Server errors (malformed email, 429) appear above the form
- [x] The new email input has a linked label; the form works at 390 px

**Verification:**
- [x] Build passes
- [x] By hand: the email with the link appears in the `runserver` terminal

**Dependencies:** Task 1

**Files likely touched:** `frontend/src/components/AuthPage.jsx`, `frontend/src/styles.css` (only if needed)

**Estimated scope:** S

## Checkpoint A
- [x] All backend tests pass; the build passes
- [x] Known and unknown emails show the same message; only the known one prints an email

## Task 3: "Set a new password" API, with tests

**Description:** Add `PasswordResetConfirmSerializer` and `PasswordResetConfirmView` at `POST /api/auth/password-reset/confirm/`: decode `uid`, check `token`, check the new password with `validate_password` (for that user) and that both entries match, then save it.

**Acceptance criteria:**
- [x] Full flow: request → uid/token from the email → confirm → sign-in with the new password works, the old one fails
- [x] A used, expired or altered link gets 400 with "This reset link is invalid or has expired."
- [x] A weak or mismatched password gets 400, and the password is unchanged

**Verification:**
- [x] Tests pass: `.venv/bin/python backend/manage.py test accounts`

**Dependencies:** Task 1

**Files likely touched:** `backend/accounts/serializers.py`, `backend/accounts/views.py`, `backend/accounts/urls.py`, `backend/accounts/tests.py`

**Estimated scope:** S

## Task 4: Reset page and the success message

**Description:** Add `ResetPasswordPage` (new password + confirm, "Save new password"). `App` shows it when the address is `/reset-password`. On success, replace the address with `/` and open sign-in mode with "Password updated. Sign in with your new password." On an invalid link, show the error and "Request a new link", which opens forgot mode.

**Acceptance criteria:**
- [x] The printed link opens the page; a valid save leads to sign-in with the success message
- [x] After success, the address bar shows `/` (no token)
- [x] Field errors (weak, mismatched) and link errors are shown; inputs have linked labels

**Verification:**
- [x] Build passes; backend tests pass
- [x] By hand: the full flow in the browser; opening the used link again shows the link error

**Dependencies:** Tasks 2 and 3

**Files likely touched:** `frontend/src/App.jsx`, `frontend/src/components/ResetPasswordPage.jsx` (new), `frontend/src/components/AuthPage.jsx`, `frontend/src/styles.css`

**Estimated scope:** M

## Checkpoint B
- [x] All tests pass; the build passes
- [x] AC1–AC6 work end to end in the browser

## Task 5: Responsive, keyboard and project notes

**Description:** Check both new screens at 390 px and with the keyboard only. Update the local `Claude.yml` notes (new endpoints, email settings, completed work) and the README's environment variables if it lists them.

**Acceptance criteria:**
- [x] No horizontal scroll at 390 px; visible focus on every new control
- [x] Notes describe the endpoints and how to see reset emails in development

**Verification:**
- [x] Full test run, build and `makemigrations --check` pass

**Dependencies:** Task 4

**Files likely touched:** `Claude.yml` (local, untracked), `README.md`

**Estimated scope:** XS

## Checkpoint: Complete
- [x] spec.md Success Criteria 1–8 all checked
- [x] Changes left uncommitted for the user's review
