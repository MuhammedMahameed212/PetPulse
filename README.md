# 🐾 PetPulse

Pet healthcare tracker for medical records, vaccinations, appointments, medications, and vet consultations.

## 🚀 Quick Start

### 1. Backend (Django)

```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python backend/manage.py migrate
python backend/manage.py runserver
```

API runs at `http://127.0.0.1:8000`.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## 📁 Project Structure

- `backend/` — Django REST Framework API
- `frontend/` — React + Vite UI
- `docs/` — one folder per user story (`PET-<n>-<name>/`): spec, plan and task list
- `.github/` — CI/CD workflows and automation

## 🗺️ Roadmap

- [x] Base setup, database config & CI/CD
- [ ] Auth & role-based routing (Owner vs. Vet)
- [ ] Pet profiles & medical records
- [ ] Vet portal (patient cards, prescriptions)
- [ ] Reminders & medication tracking
- [ ] Consultations & symptom logging
- [ ] AI medical document extraction & PDF export
- [ ] Nearby clinics & dog parks map
