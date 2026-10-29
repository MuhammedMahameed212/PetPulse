# 🐾 PetPulse

Track your Pet's medical record, Vaccines, Appointments, Medications, and Veterinary Consultations in one place.

---

## 🛠️ Prerequisites (What You Need Installed)

Before cloning the project, make sure you have these 3 tools installed on your computer:
1. **Git** — [Download Git](https://git-scm.com/)
2. **Python (3.10 or newer)** — [Download Python](https://www.python.org/downloads/) *(On Windows, check **"Add Python to PATH"** during installation)*
3. **Node.js (v18 or newer, includes `npm`)** — [Download Node.js](https://nodejs.org/)

*(You do **not** need to install Django or React globally — they are installed automatically inside the project folder using the commands below!)*

---

## 🚀 First-Time Setup (After Cloning from GitHub)

### 1. Clone the Repository
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd PetPulse
```

### 2. Set Up the Backend (Python + Django)

**On macOS / Linux:**
```bash
# 1. Create a local virtual environment (.venv)
python3 -m venv .venv

# 2. Install Django & all Python packages from requirements.txt
.venv/bin/pip install -r requirements.txt

# 3. Create your local SQLite database tables
.venv/bin/python backend/manage.py migrate

# 4. Run the Django server (http://127.0.0.1:8000)
.venv/bin/python backend/manage.py runserver
```

**On Windows (PowerShell / Command Prompt):**
```powershell
# 1. Create a local virtual environment (.venv)
python -m venv .venv

# 2. Install Django & all Python packages from requirements.txt
.venv\Scripts\pip install -r requirements.txt

# 3. Create your local SQLite database tables
.venv\Scripts\python backend/manage.py migrate

# 4. Run the Django server (http://127.0.0.1:8000)
.venv\Scripts\python backend/manage.py runserver
``
.venv/bin/python backend/manage.py runserver

### 3. Set Up the Frontend (React + Vite)

Open a **second terminal** in the project folder:
```bash
cd frontend
npm install
npm run dev
```
Then open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

- `backend/` — Python Django + Django REST Framework backend (`petpulse_core`)
- `frontend/` — React.js + Vite frontend
- `.github/` — GitHub Actions CI/CD & Metrics pipeline (`ci.yml`), Dependabot (`dependabot.yml`), Issue & PR templates
- `.coveragerc` — Code coverage configuration for backend metrics
- `requirements.txt` — Exact Python package versions (Django, DRF, JWT, CORS, Pillow, ReportLab, dotenv)

---

## 🗺️ Development Milestones

- [x] **Step 0**: Base repository setup, Database config, GitHub Actions CI/CD & Metrics
- [ ] **Milestone 1**: Infrastructure, Authentication & Role-Based Routing (Pet Owner vs. Veterinarian)
- [ ] **Milestone 2**: Pet Profiles, Weight Tracking & Medical File Permissions
- [ ] **Milestone 3**: Veterinarian Portal (Patient Cards, Visit Summaries & Prescriptions)
- [ ] **Milestone 4**: Automated Reminders, Vaccines & Medication Dose Tracking
- [ ] **Milestone 5**: Veterinarian Consultations & Symptom Logging
- [ ] **Milestone 6**: AI Medical Document Extraction & PDF Summary Export
- [ ] **Milestone 7**: Nearby Vet Clinics, Hospitals & Dog Parks Map
