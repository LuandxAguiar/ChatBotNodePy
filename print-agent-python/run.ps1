# Rodar no Windows rapidamente (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
$env:SECRET_TOKEN="troque-este-segredo"
$env:PRINTER_NAME="NomeDaImpressora"
$env:JOBS_DIR="$pwd\jobs"
# Ex.: $env:SUMATRA_PATH="C:\Tools\SumatraPDF.exe"
uvicorn app:app --host 0.0.0.0 --port 7070 --reload
