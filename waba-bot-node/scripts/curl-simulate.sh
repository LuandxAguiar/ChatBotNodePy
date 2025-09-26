#!/usr/bin/env bash
URL="${1:-http://localhost:3000/webhook}"
curl -sS -X POST "$URL" -H "Content-Type: application/json" --data @tests/example-webhook.json
echo
