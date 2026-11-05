#!/usr/bin/env bash
# Render.com unified build script for PetPulse (React SPA + Django API + PostgreSQL)
set -o errexit

echo "=== 1. Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== 2. Installing & building React frontend ==="
npm ci --prefix frontend
npm run build --prefix frontend

echo "=== 3. Collecting Django static files ==="
python backend/manage.py collectstatic --noinput

echo "=== 4. Applying database migrations ==="
python backend/manage.py migrate

