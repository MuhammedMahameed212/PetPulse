# 🐾 PetPulse

Track your Pet's medical record, Vaccines, Appointments, Medications, and Veterinary Consultations in one place.

## Project Structure (Step 0 — Base Skeleton & CI/CD)

- `backend/` — Python Django + Django REST Framework backend (`petpulse_core`)
- `frontend/` — React.js + Vite frontend
- `.github/` — GitHub Actions CI/CD & Metrics pipeline (`ci.yml`), Dependabot (`dependabot.yml`), Issue & PR templates
- `.coveragerc` — Code coverage configuration for backend metrics
- `.venv/` — Local Python virtual environment

## Database Configuration

- **Local Development & CI**: Configured out-of-the-box with **SQLite** (`backend/db.sqlite3`).
- **Production / SQL Server / PostgreSQL**: Configurable via `backend/.env` (see `backend/.env.example`) by setting `DB_ENGINE=mssql` (MS SQL Server) or `DB_ENGINE=postgres` (PostgreSQL).

## Running Locally

1. **Apply Database Migrations & Start Django Backend** (`http://127.0.0.1:8000`):
   ```bash
   .venv/bin/python backend/manage.py migrate
   .venv/bin/python backend/manage.py runserver
   ```
   - Health endpoint: `http://127.0.0.1:8000/api/health/`
   - Live System & DB Metrics endpoint: `http://127.0.0.1:8000/api/metrics/`

2. **Start React Frontend** (`http://localhost:5173`):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Run Automated Tests**:
   ```bash
   .venv/bin/python backend/manage.py test petpulse_core
   ```

## Development Milestones

- [x] **Step 0**: Base repository setup, Database config, GitHub Actions CI/CD & Metrics
- [ ] **Milestone 1**: Infrastructure, Authentication & Role-Based Routing (Pet Owner vs. Veterinarian)
- [ ] **Milestone 2**: Pet Profiles, Weight Tracking & Medical File Permissions
- [ ] **Milestone 3**: Veterinarian Portal (Patient Cards, Visit Summaries & Prescriptions)
- [ ] **Milestone 4**: Automated Reminders, Vaccines & Medication Dose Tracking
- [ ] **Milestone 5**: Veterinarian Consultations & Symptom Logging
- [ ] **Milestone 6**: AI Medical Document Extraction & PDF Summary Export
- [ ] **Milestone 7**: Nearby Vet Clinics, Hospitals & Dog Parks Map
