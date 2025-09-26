from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import os, datetime, hashlib, hmac, uuid, base64, requests
from printer import print_pdf
from util import ensure_dir

APP_NAME = "print-agent-fastapi"
app = FastAPI(title=APP_NAME)

SECRET_TOKEN = os.getenv("SECRET_TOKEN")  # opcional (se setar, valida HMAC)
PRINTER_NAME = os.getenv("PRINTER_NAME", "")  # nome padrão
SUMATRA_PATH = os.getenv("SUMATRA_PATH", "")  # Windows: caminho do SumatraPDF.exe

JOBS_DIR = os.getenv("JOBS_DIR", "/mnt/data/print-agent-fastapi/jobs")
ensure_dir(JOBS_DIR)

class PrintJob(BaseModel):
    job_id: str | None = Field(default=None, description="Identificador do job; se não vier, o agente cria.")
    pdf_base64: str | None = None
    pdf_url: str | None = None
    printer: str | None = None
    copies: int = 1
    duplex: bool = False
    paper: str = "A4"

def verify_signature(request_body: bytes) -> None:
    if not SECRET_TOKEN:
        return
    sig = None
    # header customizado (ex.: X-Agent-Signature: sha256=...)
    # também aceita 'x-agent-signature'
    for k, v in request.headers.items():
        if k.lower() == "x-agent-signature":
            sig = v
            break
    if not sig or not sig.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Assinatura ausente/invalid")
    provided = sig.split("=", 1)[1]
    mac = hmac.new(SECRET_TOKEN.encode("utf-8"), msg=request_body, digestmod=hashlib.sha256).hexdigest()
    if not hmac.compare_digest(provided, mac):
        raise HTTPException(status_code=401, detail="Assinatura inválida")

@app.get("/health")
def health():
    return {"ok": True, "time": datetime.datetime.utcnow().isoformat()}

@app.post("/print")
async def submit_print(request: Request):
    raw = await request.body()
    try:
        verify_signature(raw)
    except HTTPException as e:
        raise e
    data = await request.json()
    job = PrintJob(**data)
    job_id = job.job_id or f"{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    printer = job.printer or PRINTER_NAME

    if not (job.pdf_base64 or job.pdf_url):
        raise HTTPException(status_code=400, detail="Envie 'pdf_base64' ou 'pdf_url'.")

    # Baixa/cria o PDF
    pdf_path = os.path.join(JOBS_DIR, f"{job_id}.pdf")
    if job.pdf_base64:
        try:
            content = base64.b64decode(job.pdf_base64, validate=True)
        except Exception:
            raise HTTPException(status_code=400, detail="pdf_base64 inválido")
        with open(pdf_path, "wb") as f:
            f.write(content)
    else:
        try:
            r = requests.get(job.pdf_url, timeout=30)
            r.raise_for_status()
            with open(pdf_path, "wb") as f:
                f.write(r.content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Falha ao baixar pdf_url: {e}")

    # Dispara impressão
    try:
        result = print_pdf(pdf_path, printer=printer, copies=job.copies, duplex=job.duplex, paper=job.paper, sumatra_path=SUMATRA_PATH)
        return JSONResponse({
            "ok": True,
            "job_id": job_id,
            "printer": printer,
            "copies": job.copies,
            "duplex": job.duplex,
            "paper": job.paper,
            "pdf_path": pdf_path,
            "result": result
        })
    except Exception as e:
        return JSONResponse({
            "ok": False,
            "job_id": job_id,
            "printer": printer,
            "error": str(e),
            "pdf_path": pdf_path
        }, status_code=500)
