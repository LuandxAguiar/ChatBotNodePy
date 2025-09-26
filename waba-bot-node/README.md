# WABA Bot (Node) — MVP

## Rodar
```powershell
npm install
cp .env.example .env  # Windows PowerShell: Copy-Item .env.example .env
# edite .env (VERIFY_TOKEN, WABA_PHONE_NUMBER_ID, WABA_ACCESS_TOKEN)
npm run dev
```

Webhook de verificação (Meta):
```
GET /webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123
```

Simular POST (PowerShell):
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/webhook" -Method POST -ContentType "application/json" -Body (Get-Content ".\tests\example-webhook.json" -Raw)
```

Saídas: `registro_atendimentos.csv` e `oficio_<PROTOCOLO>.html` no diretório atual.
