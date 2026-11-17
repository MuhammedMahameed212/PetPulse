# Spec: Password Reset (PET-22) — V1

Status: implemented (2026-11-17)
Jira: PET-22 (US-22), Milestone 1 (PET-24)

## Objective

A registered user who forgot their password can get back into their account without help.

User story (US-22): As a registered user, I want to recover my password if I forgot it, so I can regain access to my account.

| AC | Acceptance criterion | How V1 meets it |
|----|---------------------|-----------------|
| AC1 | The sign-in screen has a "Forgot password" option | A "Forgot password?" link under the password field in sign-in mode |
| AC2 | The user enters the email address of the account | "Reset your password" form with one email field |
| AC3 | A secure reset process | A one-time link sent by email (see Security) |
| AC4 | The user sets a new password | The link opens a "Set a new password" form (new password + confirm) |
| AC5 | The user can sign in with the new password | After saving, the sign-in screen opens with "Password updated. Sign in with your new password." |
| AC6 | Invalid input shows a suitable message | Messages for: empty or malformed email, expired or used link, weak password, passwords that don't match, too many requests |

## Security

- **Reset link** = `<FRONTEND_URL>/reset-password?uid=<uid>&token=<token>`, made with Django's built-in `default_token_generator` (the same one Django's own admin password reset uses). Nothing new is stored in the database.
- **One-time:** the token is tied to the password hash and last sign-in time, so it stops working as soon as the password changes.
- **Expires after 1 hour** (`PASSWORD_RESET_TIMEOUT = 3600`; Django's default is 3 days).
- **No account guessing:** "send link" always answers the same message ("If an account uses that email, we've sent a reset link."), whether or not the email exists. Unknown emails, inactive accounts and accounts without a usable password get no email.
- **Rate limit:** at most 5 reset requests per hour per IP address, using DRF's built-in throttling (answer 429 with a clear message).
- **Link host comes from settings** (`FRONTEND_URL`), never from the request's `Host` header, so a crafted request can't make the email point to another site.
- The new password goes through the same `AUTH_PASSWORD_VALIDATORS` as registration and change password.
- The token never appears in server logs we write, and the frontend removes it from the address bar once the password is saved.

## Email

- **Development (decided):** Django's console email backend. The email, including the link, is printed in the `runserver` terminal. No email account is needed.
- **Later:** real sending through any SMTP service (e.g. Mailtrap, Brevo) by setting environment variables; no code change.

| Setting | Read from | Default |
|---------|-----------|---------|
| `EMAIL_BACKEND` | env `EMAIL_BACKEND` | `django.core.mail.backends.console.EmailBackend` |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` | env, same names | Django defaults |
| `DEFAULT_FROM_EMAIL` | env `DEFAULT_FROM_EMAIL` | `PetPulse <no-reply@petpulse.local>` |
| `FRONTEND_URL` | env `FRONTEND_URL` | `http://localhost:5173` |

The email is plain text: greeting with the username, the link, "This link works once and expires in 1 hour", and "If you didn't ask for this, ignore this email; your password stays the same."

## API

| Method | Path | Auth | Body | Success | Errors |
|--------|------|------|------|---------|--------|
| POST | `/api/auth/password-reset/` | none | `{ "email" }` | 200 `{ "detail": "If an account uses that email, we've sent a reset link." }` | 400 empty/malformed email; 429 too many requests |
| POST | `/api/auth/password-reset/confirm/` | none | `{ "uid", "token", "new_password", "new_password_confirm" }` | 200 `{ "detail": "Password updated." }` | 400 `{ "token": ["This reset link is invalid or has expired."] }`; 400 password validation or mismatch |

Email matching ignores letter case (`email__iexact`).

## Frontend

No router is added. `App` already decides the screen from state; it gains one check on load:

- If the address is `/reset-password?uid=…&token=…`, show `ResetPasswordPage` (inside `ThreeLayerShell`, same look as the sign-in page).
- `AuthPage` gets a third mode, `"forgot"`, next to `"login"` and `"register"`:
  - Sign-in mode shows a "Forgot password?" link that switches to the forgot mode.
  - Forgot mode: one email field, "Send reset link", and "Back to sign in". After sending, the form is replaced by the generic confirmation message.
- `ResetPasswordPage`: new password + confirm, "Save new password". On success it replaces the address with `/` (removing the token) and opens sign-in mode with the success message. On an invalid or expired link it shows the error and a "Request a new link" button that opens forgot mode.
- New inputs have linked labels (`htmlFor`/`id`) and work at 390 px width.

## Tech Stack

Unchanged: Django 5.2, DRF 3.18 (built-in `ScopedRateThrottle`), SimpleJWT, React 18 + Vite 6. No new dependencies.

## Commands

```
Backend tests: .venv/bin/python backend/manage.py test petpulse_core accounts --verbosity=1
Backend check: .venv/bin/python backend/manage.py check
Migrations:    .venv/bin/python backend/manage.py makemigrations --check --dry-run   (no migration expected)
Build:         cd frontend && npm run build
Dev:           .venv/bin/python backend/manage.py runserver   +   cd frontend && npm run dev
```

## Project Structure

```
backend/accounts/serializers.py   PasswordResetRequestSerializer, PasswordResetConfirmSerializer
backend/accounts/views.py         PasswordResetRequestView, PasswordResetConfirmView
backend/accounts/urls.py          password-reset/, password-reset/confirm/
backend/accounts/tests.py         US22PasswordResetTests
backend/petpulse_core/settings.py email settings, FRONTEND_URL, PASSWORD_RESET_TIMEOUT, throttle rate
frontend/src/App.jsx              /reset-password check on load
frontend/src/components/AuthPage.jsx           "forgot" mode + success message
frontend/src/components/ResetPasswordPage.jsx  new
frontend/src/styles.css           only if the existing auth styles don't cover it
```

## Code Style

Follow the existing `accounts` code: one serializer per request shape, thin `APIView`s, and tests named after the story and criterion.

```python
class PasswordResetConfirmView(APIView):
    """US-22 (AC3–AC5): set a new password from a valid reset link."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated."})
```

## Testing Strategy

Django `TestCase` in `backend/accounts/tests.py`, class `US22PasswordResetTests`. Emails are checked through `django.core.mail.outbox` (Django swaps in a memory backend during tests).

- A known email sends exactly one email with a link to `FRONTEND_URL/reset-password?uid=…&token=…`; the email address is matched without regard to case.
- An unknown email answers the same 200 message and sends nothing; an inactive user gets nothing.
- An empty or malformed email answers 400.
- The full flow: request → take uid/token from the email → confirm → sign in with the new password works and the old one fails (AC5).
- The same link used a second time answers 400 (one-time).
- An expired link answers 400 (`override_settings` / time shift).
- A tampered token or uid answers 400; a weak or mismatched password answers 400 and the password is unchanged.
- The 6th request in an hour answers 429.

By hand: the link printed in the terminal opens the reset page in the browser; the whole flow at desktop and 390 px width.

## Boundaries

- **Always:** run backend tests and the build before calling a task done; reference PET-22 in commit messages; generic answer for the email lookup.
- **Ask first:** new dependencies; adding a router; a database migration; changing the existing login, register or change-password behavior.
- **Never:** commit or push (the user commits); put real SMTP credentials in code or `.env.example`; say in any response whether an email is registered; log the reset token.

## Success Criteria

1. The sign-in screen shows "Forgot password?"; it opens a form that asks for an email.
2. Sending a registered email prints an email with a working reset link in the `runserver` terminal; any email gets the same on-screen message.
3. The link opens "Set a new password"; saving a valid password shows the sign-in screen with a success message, and signing in with the new password works while the old one fails.
4. A used, expired (over 1 hour) or altered link is refused with a clear message and a way to request a new one.
5. Weak passwords, mismatched passwords and malformed emails show clear messages.
6. More than 5 requests in an hour from one IP are refused with a clear message.
7. All backend tests pass, the build passes, and no migration is created.
8. Existing sign-in, registration, change password and role routing still work.

## Out of Scope (Deferred)

- **Signing out other devices after a reset.** Existing JWTs stay valid until they expire (up to 12 hours); this needs SimpleJWT's token blacklist and a migration.
- **An HTML email template.** Plain text is enough for V1.
- **Real email delivery** (Mailtrap/Brevo account). Settings are ready; no account yet.
- **Linking labels to inputs on the existing sign-in and registration fields.** A known issue outside this story.

## Resolved Questions

1. Link lifetime: 1 hour.
2. Signing out other devices after a reset: deferred (see Out of Scope).
3. After a reset: go to the sign-in screen with a success message (simplest, and it shows AC5 directly).
