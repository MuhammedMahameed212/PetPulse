# Claude Project Instructions & Context — PetPulse

project:
  name: PetPulse
  type: Software Engineering Final Project (SCE 2026)
  description: >
    Full-stack pet health management and veterinary collaboration platform.
    Centralizes digital pet medical records, vaccinations, periodic treatments,
    medications, symptom logs, reminders, multi-owner/caregiver sharing,
    a dedicated Veterinarian Portal, AI medical document extraction (OCR),
    and a nearby clinics & dog parks map.
  live_url: https://petpulse-web.onrender.com
  requirements_doc: >
    "docs/פרוייקט גמר.docx" (Hebrew) is the source of truth for the course: background, market research
    (11Pets, VitusVet, PetDesk), user groups, US-1..US-23 with acceptance criteria, FR01–FR22, NFR01–NFR07,
    architecture and the 7 development milestones. Read the story's US and FR there before writing its spec.
  story_to_requirement: >
    PET-<n> = US-<n>. FR per story: US-1 FR02, US-2 FR03, US-3 FR04, US-4 FR05, US-5 FR06, US-6 FR07,
    US-7 FR08, US-8 FR09, US-9 FR10, US-10 FR11, US-11 FR12, US-12 FR13, US-13 FR14, US-14 FR15,
    US-15 FR01, US-16 FR16, US-17 FR21, US-18 FR17, US-19 FR18, US-20 FR19, US-21 FR20, US-22 FR22, US-23 FR01.
  non_functional: >
    NFR01 security (auth required, permission checked on every read/write, revoked access stops at once),
    NFR02 performance (loading indicator for slow work like AI/PDF; external failures never hang the app),
    NFR03 usability (clear labels, field-level errors, success/error messages), NFR04 reliability (no partial saves;
    a failing map/AI service doesn't break the rest), NFR05 responsive (owner UI mobile-first, vet portal desktop),
    NFR06 maintainability (modular, swappable external services, documented), NFR07 accessibility (contrast,
    errors not by colour alone, comfortable touch targets).
  jira:
    site: https://petpulse.atlassian.net
    project_key: PET
  figma:
    design_file: https://www.figma.com/design/NkLufMj4YqGbBicbFeb2VW/PetPulse
    figjam_flow: https://www.figma.com/board/uknTrmLpiTSjHbnctsbPa6

tech_stack:
  backend:
    framework: Django + Django REST Framework (DRF) + SimpleJWT
    python_env: .venv/bin/python
    database: DATABASE_URL wins (PostgreSQL on Render); else DB_ENGINE=sqlite (default, backend/db.sqlite3) | postgres | mssql
    static_serving: WhiteNoise + Gunicorn (serves compiled React SPA from frontend/dist)
  frontend:
    framework: React 18 + Vite 6 (frontend/)
    design_system: >
      Exam-paper sage (#e8ede6), pine ink (#132a25) and collar cobalt (#2c45f5); Fraunces display +
      Instrument Sans body. Tokens live in :root in frontend/src/styles.css and are shared by every page.
      Landing adds a three.js collar tag (CollarTag3D.jsx) and a CSS-3D record stack (landing.css).
  deployment_and_ci:
    hosting: Render.com (render.yaml + build.sh)
    ci_cd: .github/workflows/CICD.yml
    tracked_metrics:
      - Lead Time for Changes
      - Deployment Frequency
      - MTTR (Mean Time to Recovery)
      - Change Failure Rate
      - Build Success Rate
      - Test Coverage (coverage.xml + .coveragerc)

repository_structure:
  backend/:
    manage.py: Django CLI entry point
    petpulse_core/:
      settings.py: Core settings, JWT, CORS, WhiteNoise, DATABASE_URL, FRONTEND_DIST_DIR
      urls.py: /admin/, /api/health/, /api/metrics/, /api/auth/, nested pet apps, /api/reminders/, /api/medications/due-doses/, and SPA catch-all
      tests.py: Health, metrics, and SPA root route tests
    accounts/:
      models.py: Custom User model with roles (PET_OWNER, VETERINARIAN) & clinic/license fields
      serializers.py: Registration, login, user profile, change-password, and password-reset serializers
      views.py: RegisterView, LoginView, LogoutView, ChangePasswordView, CurrentUserView, PasswordResetRequestView (throttled), PasswordResetConfirmView
      urls.py: /api/auth/{register,login,logout,change-password,me,password-reset,password-reset/confirm}/
      admin.py: UserAdmin configuration
      tests.py: US-15, US-23 & US-22 registration, login, role routing, token, and password-reset tests
    pets/:
      models.py: Pet (owner FK, name, species, breed, birth_date + is_estimate, weight_kg, photo as JPEG bytes)
      serializers.py: PetSerializer validation + process_photo (JPEG/PNG/WebP ≤5 MB → upright, ≤512 px JPEG, EXIF stripped)
      access.py: accessible_pets(user) — the one access rule for pets and their records (PET-21 will add vet sharing)
      permissions.py: IsPetOwner (vets get 403)
      views.py: PetViewSet, queryset = accessible_pets(request.user) (other owners' pets → 404)
      urls.py: /api/pets/ (GET, POST) and /api/pets/<id>/ (GET, PATCH, DELETE)
      tests.py: PET-1 (US-1) create/list/edit/delete, isolation, roles, validation, photo tests
    medications/:
      models.py: Medication (pet FK, name, dosage, frequency, dose_times, start/end date, notes) + DoseLog (one given dose per scheduled slot)
      serializers.py: MedicationSerializer + DoseSerializer validation
      views.py: MedicationViewSet nested under a pet via accessible_pets; mark_dose / undo_dose actions; DueDosesView (/api/medications/due-doses/)
      due.py: due_doses(user, now) — today's daily doses whose time passed and aren't given, read live from the schedule (PET-5, US-4 AC3)
      urls.py: /api/pets/<pet_id>/medications/ (CRUD) + /<id>/doses/ (POST) + /<id>/doses/<dose_id>/ (DELETE)
      tests.py: PET-4 (US-4) medication CRUD, isolation, dose marking/undo tests + PET-5 due-dose tests
    symptoms/:
      models.py: SymptomLog (pet FK, occurred_at, description, notes, severity, status, created_by) + SymptomAttachment (photo/video bytes in the DB)
      media.py: read_attachment — photo via process_photo (1280 px) or video by header (MP4/MOV ftyp, WebM EBML, ≤10 MB)
      views.py: SymptomViewSet nested under a pet via accessible_pets; ?status= filter; author-only edit/delete; attachments upload/download/delete actions (≤3 files, ≤1 video)
      urls.py: /api/pets/<pet_id>/symptoms/ (CRUD) + /<id>/attachments/ (POST) + /<id>/attachments/<att_id>/ (GET, DELETE)
      tests.py: PET-6 (US-6) records, filter, author-only, files, limits, access tests
    reminders/:
      models.py: Reminder (pet FK, kind MEDICATION/VACCINATION/TREATMENT/VET_VISIT, title, due_at, repeat NONE/WEEKLY/MONTHLY/YEARLY, optional medication FK, notes, done_at/done_by); can_be_marked_done (from its due day), mark_done (creates the next repeat)
      recurrence.py: next_due(due_at, repeat) — pure date step in local wall-clock time, month-end clamp
      serializers.py: ReminderSerializer (medication limited to the URL's pet; done reminders locked; is_due, can_mark_done, medication_name)
      views.py: ReminderViewSet nested under a pet (?status=open|done; done/ action with a row lock) + AllRemindersView (/api/reminders/, ?due=1)
      urls.py: /api/pets/<pet_id>/reminders/ (CRUD) + /<id>/done/ (POST)
      tests.py: PET-5 (US-5) CRUD, validation, ordering, done + repeat, due-day rule, medicine link, all-pets list, access tests
  frontend/:
    vite.config.js: Dev server on :5173, proxies /api and /media -> 127.0.0.1:8000
    src/App.jsx: Auth state check (/api/auth/me/) + Landing / Auth / Role Dashboard routing
    src/api.js: Fetch wrapper & JWT token storage helpers (sends FormData as multipart)
    src/petAge.js: Pet age + local-date helpers (localToday, showDate) from YYYY-MM-DD strings (no UTC shift); tested in petAge.test.js
    src/reminders.js: Reminder type/repeat labels, defaultDueAt, the petpulse:due-changed event; tested in reminders.test.js
    src/dueAlerts.js: Pure alert helpers (reminder/dose alert keys, what's new, notification text); tested in dueAlerts.test.js
    src/useDueAlerts.js: Hook that polls due reminders + doses every 60 s, feeds the bell, shows browser notifications once
    src/styles.css: Design tokens + auth/dashboard styles (landing-only styles in components/landing.css)
    src/components/:
      ThreeLayerShell.jsx: Page frame for auth + dashboards (centred sheet); also exports the PulseMark logo
      LandingPage.jsx: Landing page (3D collar tag + pet switcher, 3D record stack with scan demo, owner/vet toggle, roadmap)
      AuthPage.jsx: Sign-in & role-based registration form (Pet Owner vs Veterinarian)
      ForgotPasswordForm.jsx: Request a password-reset link
      ResetPasswordPage.jsx: Set a new password from a reset link
      OwnerDashboard.jsx: Pet Owner portal (My pets list / add / pet page / edit, Reminders tab, Account settings) + reminder bell
      PetList.jsx: Pet cards, empty state, PetAvatar, SPECIES labels
      PetForm.jsx: Shared add/edit pet form with photo picker
      PetProfile.jsx: Pet page (facts, edit, delete dialog, medications, symptoms and reminders panels)
      MedicationsPanel.jsx: Pet's medications list + today's doses (mark / undo)
      MedicationForm.jsx: Add/edit medication form
      SymptomsPanel.jsx: Pet's symptom history + filter, resolve/reopen, delete, photo/video thumbnails
      SymptomForm.jsx: Add/edit symptom form with photo/video picker (saves the record, then uploads files one by one)
      AttachmentView.jsx: Fetches a symptom file with the token and shows it from a blob URL
      RemindersPanel.jsx: Pet's reminders (Upcoming / Done), mark done, edit, delete dialog
      ReminderForm.jsx: Add/edit reminder form (type, title, date+time, repeat, linked medicine for Medication)
      RemindersOverview.jsx: All-pets Reminders tab (Doses due / Overdue / Upcoming, enable notifications)
      ReminderBell.jsx: Top-bar bell with the due count
      VetDashboard.jsx: Veterinarian portal shell
      UserProfileMenu.jsx: Top-right profile dropdown menu
      ChangePasswordCard.jsx: Password update card

completed_work:
  - Backend foundation, health/metrics endpoints (/api/health/, /api/metrics/), and unified SPA serving
  - Render.com deployment config (render.yaml, build.sh)
  - Milestone 1 auth & roles:
      - PET-15 (US-15): Registration, JWT login, logout, /api/auth/me/, change password
      - PET-23 (US-23): PET_OWNER vs VETERINARIAN roles and role-based dashboard routing
      - PET-22 (US-22): Forgot/reset password (1-hour links; console email backend until SMTP is set in .env). Docs in docs/PET-22-password-reset/
  - GitHub Actions CI/CD (.github/workflows/CICD.yml) with backend-ci, frontend-ci, dora-metrics, and deploy-production
  - Jira Gantt timeline structured into 5 Milestone Epics (PET-24 to PET-28) wrapping PET-1 to PET-23
  - Figma Design code layer + FigJam screens flow diagram
  - Landing redesign (3D collar tag, 3D record stack) and unified sage/ink/cobalt theme across all screens
  - Milestone 2:
      - PET-1 (US-1): Pet profiles (create, list, edit, delete, photo). Docs in docs/PET-1-pet-profiles/
      - PET-4 (US-4): Medications and daily dose tracking. Docs in docs/PET-4-medications/
      - PET-6 (US-6): Symptom log with photos/video, filter, author-only edit. Docs in docs/PET-6-symptoms/
      - PET-5 (US-5): Reminders (4 types, repeat, mark done from the due day, medicine link), all-pets tab, bell + browser notifications incl. due medicine doses (US-4 AC3). Docs in docs/PET-5-reminders/
  - Each user story's spec.md, plan.md and todo.md live in docs/PET-<n>-<slug>/

roadmap_milestones:
  - PET-24 (Milestone 1): Registration & Account Management (PET-15, PET-23, PET-22 done; next -> PET-20 US-20 profile update)
  - PET-25 (Milestone 2): Pet Profile & Full Medical Management (PET-1, PET-4, PET-6, PET-5 done; PET-17, 12, 2, 19, 3, 18)
  - PET-26 (Milestone 3): Sharing Pet Info, Access Control & Summary Export (PET-21, 16, 9)
  - PET-27 (Milestone 4): Veterinarian Collaboration & Consultations (PET-10, 11, 14)
  - PET-28 (Milestone 5): Medical Documents, AI OCR & Nearby Clinics/Parks Map (PET-7, 8, 13)

instructions_for_claude:
  commands:
    backend_tests: ".venv/bin/python backend/manage.py test petpulse_core accounts pets medications symptoms reminders --verbosity=1"
    backend_coverage: ".venv/bin/coverage run --rcfile=.coveragerc backend/manage.py test petpulse_core accounts pets medications symptoms reminders && .venv/bin/coverage report --rcfile=.coveragerc"
    backend_check: ".venv/bin/python backend/manage.py check"
    frontend_tests: "cd frontend && npm test"
    frontend_build: "cd frontend && npm run build"
    frontend_dev: "cd frontend && npm run dev"
    backend_dev: ".venv/bin/python backend/manage.py runserver"
  coding_rules:
    - Always run backend tests and frontend build after edits before claiming work is complete.
    - Keep solutions minimal and idiomatic; reuse ThreeLayerShell, .layer-2-glass-stage, .layer-3-card, and the :root tokens in frontend/src/styles.css.
    - Never break existing role-based routing (PET_OWNER -> OwnerDashboard, VETERINARIAN -> VetDashboard) or unauthenticated blocking on protected routes.
    - Never commit secrets, .env files, db.sqlite3 changes unrelated to migrations, or generated build/static folders.
    - Reference Jira issue keys (e.g., PET-20) in commit messages so Jira Development & DORA tracking link commits/builds/deployments automatically.
    - Always understand what you are building, don't just generate code, feel free to grill me as much as you want.
    - I like Modularity in coding, seperating logic and making it simple.
    - use Agent Skills if you feel they will help, especially Agent-skills.
    - I like clean code, clean architecture, and clean code structure.
    - Don't over-engineer, keep it simple.
    - I'm a Software Engineering student, this is my Final Year project. I have to document everything we do including metrics, Jira tickets, and more.
    - we work using the scrum technique, we develop each user story fully before moving to the next one.
    - Per user story, write docs/PET-<n>-<slug>/{spec,plan,todo}.md before coding, and keep todo.md ticked as work lands.
    - Anything that belongs to a pet (medications, vaccinations, symptoms...) goes in its own Django app, nested under /api/pets/<pet_id>/, and loads the pet through pets.access.accessible_pets so a pet the user can't reach answers 404.
    - A new backend app must be added to INSTALLED_APPS, the test list in .github/workflows/CICD.yml, and the backend_tests/backend_coverage commands above.
    - Commit new migrations together with the model change that needs them.