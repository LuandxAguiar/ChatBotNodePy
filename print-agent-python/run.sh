#!/usr/bin/env bash
set -e
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SECRET_TOKEN="troque-este-segredo"
export PRINTER_NAME="NomeDaImpressora"
export JOBS_DIR="$PWD/jobs"
uvicorn app:app --host 0.0.0.0 --port 7070 --reload
