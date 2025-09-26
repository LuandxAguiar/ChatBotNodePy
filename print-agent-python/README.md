# Agente Local de Impressão (FastAPI)

Recebe jobs de impressão via HTTP e envia **PDF** diretamente ao spooler do sistema (Windows: SumatraPDF / Linux: CUPS).

## Endpoints
- `GET /health` → `{ ok: true }`
- `POST /print` → payload JSON:
```json
{
  "job_id": "opcional-string",
  "pdf_base64": "BASE64_DO_PDF",
  "pdf_url": "https://...opcional...",
  "printer": "NomeDaImpressora (opcional)",
  "copies": 1,
  "duplex": false,
  "paper": "A4"
}
```
> Envie **pdf_base64** ou **pdf_url** (um dos dois).

### Segurança
Se `SECRET_TOKEN` for definido, envie o cabeçalho:
```
X-Agent-Signature: sha256=<HMAC_HEX_DO_CORPO>
```
Calculado como HMAC-SHA256 do corpo bruto com a chave `SECRET_TOKEN`.

## Windows (recomendado)
1. Instale o Python 3.10+
2. Baixe o **SumatraPDF** e defina `SUMATRA_PATH` no `.env` para **impressão silenciosa**:
   `SUMATRA_PATH=C:\Tools\SumatraPDF.exe`
3. Rode:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
$env:SECRET_TOKEN="seu-segredo"
$env:PRINTER_NAME="NomeDaImpressora"
$env:SUMATRA_PATH="C:\Tools\SumatraPDF.exe"
uvicorn app:app --host 0.0.0.0 --port 7070 --reload
```
4. Teste:
```powershell
Invoke-WebRequest -Uri "http://localhost:7070/health"
# Exemplo com base64 (substitua <BASE64>)
$body = @{
  job_id="teste-001"
  pdf_base64="<BASE64>"
  printer="$env:PRINTER_NAME"
  copies=1
  duplex=$false
} | ConvertTo-Json
$mac = New-Object System.Security.Cryptography.HMACSHA256 ([Text.Encoding]::UTF8.GetBytes($env:SECRET_TOKEN))
$bytes = [Text.Encoding]::UTF8.GetBytes($body)
$hash = ($mac.ComputeHash($bytes) | ForEach-Object ToString x2) -join ''
Invoke-WebRequest -Uri "http://localhost:7070/print" -Method POST -ContentType "application/json" `
  -Headers @{ "X-Agent-Signature" = "sha256=$hash" } -Body $body
```

> Sem `SUMATRA_PATH`, o agente tenta `os.startfile(..., "print")` (pode abrir UI e usa a impressora padrão).

## Linux (CUPS)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SECRET_TOKEN=seu-segredo
export PRINTER_NAME=NomeDaImpressora
uvicorn app:app --host 0.0.0.0 --port 7070 --reload
# imprimir
curl -X POST http://localhost:7070/print -H "Content-Type: application/json" -d '{
  "job_id":"teste-001",
  "pdf_url":"https://exemplo.com/oficio.pdf",
  "printer":"NomeDaImpressora",
  "copies":1,
  "duplex":false
}'
```

## Como rodar como serviço
- **Windows**: use [NSSM](https://nssm.cc/) para registrar o `uvicorn app:app` como serviço e iniciar com o Windows.
- **Linux**: crie um unit `systemd` apontando para `uvicorn` com as env vars exportadas.

## Observações
- Para imprimir **em silêncio** no Windows, **use SumatraPDF** (caminho em `SUMATRA_PATH`).
- Para controle avançado (bandeja/tamanho) você pode depois usar `pywin32` e o driver da impressora.
