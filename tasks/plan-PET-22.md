# Implementation Plan: Password Reset (PET-22) — V1

Source spec: `SPEC-PET-22.md` (approved 2026-11-17)
Task list: `tasks/todo-PET-22.md`. Files are named per story so they don't clash with PET-1's `tasks/plan.md` when both branches reach `main`. Jira tracks the story as a whole (PET-22).

## Overview

A user who forgot their password asks for a reset link from the sign-in screen, opens the link from the email (printed in the `runserver` terminal during development), sets a new password and signs in with it. Built in two vertical slices: "ask for a link" (API + form) and "use the link" (API + page).

## Dependency Graph

```
Email + reset settings (EMAIL_*, FRONTEND_URL, PASSWORD_RESET_TIMEOUT, throttle rate)
  └── POST /api/auth/password-reset/ ─────────── AuthPage "forgot" mode
        └── (email contains uid + token)
              └── POST /api/auth/password-reset/confirm/ ── ResetPasswordPage + App /reset-password check
                                                              └── AuthPage success message
```

## Architecture Decisions

- **Django's `default_token_generator`, not a new model.** It is what Django's own password reset uses: the token is tied to the password hash and last sign-in, so it is one-time and expires (`PASSWORD_RESET_TIMEOUT = 3600`). No table, no migration, no cleanup job.
- **Two `APIView`s in `accounts`**, next to the existing login and change-password views, each with its own serializer. Reset is part of account management, so no new app.
- **DRF `ScopedRateThrottle` (`password_reset: 5/hour`)** on the request endpoint only. Built in; uses the default cache, which is per process; enough for a local, single-process server.
- **Link host from `FRONTEND_URL`**, never from the request, so a forged `Host` header can't redirect the link.
- **No router.** `App` checks `window.location.pathname === "/reset-password"` once on load, as it already decides other screens from state. After success it uses `history.replaceState` to drop the token from the address bar.
- **`AuthPage` gets a third mode, `"forgot"`,** instead of a separate page, so it shares the sign-in layout and "Back to sign in" is a mode switch.

## Task List

### Phase 1: Ask for a reset link (AC1, AC2, AC3 first half, AC6 for email)
- [x] Task 1: Email settings and `POST /api/auth/password-reset/`, with tests
- [x] Task 2: "Forgot password?" link and the forgot mode on the sign-in page

### Checkpoint A
- [x] Backend tests pass; the build passes; `makemigrations --check` is clean
- [x] By hand: sign-in → "Forgot password?" → enter a registered email → the email with the link appears in the `runserver` terminal; an unknown email shows the same message and prints nothing

### Phase 2: Use the link (AC3 second half, AC4, AC5, AC6 for passwords and links)
- [x] Task 3: `POST /api/auth/password-reset/confirm/`, with tests
- [x] Task 4: Reset page, `App` check for `/reset-password`, success message on sign-in

### Checkpoint B
- [x] Backend tests pass; the build passes
- [x] By hand: open the printed link → set a new password → sign-in screen with success message → new password works, old one fails; opening the same link again shows "invalid or expired" with "Request a new link"

### Phase 3: Finish
- [x] Task 5: 390 px and keyboard pass, project notes

### Checkpoint: Complete
- [x] Every Success Criterion in SPEC-PET-22.md (1–8) is checked
- [x] Changes left uncommitted for the user's review (the user commits with `PET-22: …`)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| The response reveals whether an email is registered | High | One fixed message and status for every valid email; a test compares known and unknown answers |
| The reset link points to the wrong place | Med | Built from `FRONTEND_URL` (default `http://localhost:5173`, the Vite dev server); a test checks the link |
| The token stays in the address bar or browser history | Low | `history.replaceState("/")` after a successful reset |
| Throttle counts carry over between tests | Low | Clear the cache in the test `setUp` |
| Email lookup is case-sensitive | Low | `email__iexact`; tested |
| An unusual email address matches two accounts by case | Low | `email` is unique, but only case-sensitively; send one email per matching active user, as Django's own form does |

## Parallelization

Each frontend task needs its backend endpoint, so the work runs in order. Task 5 could run alongside nothing else meaningful.

## Open Questions

None. All were resolved in SPEC-PET-22.md.
