// src/printAgent.js
import axios from 'axios';
import crypto from 'crypto';

const PRINT_AGENT_URL = process.env.PRINT_AGENT_URL;
const PRINT_AGENT_SECRET = process.env.PRINT_AGENT_SECRET;
const PRINTER_NAME = process.env.PRINTER_NAME || '';

export async function enviarParaImpressaoBase64(pdfBase64, jobId) {
  if (!PRINT_AGENT_URL) {
    console.warn('PRINT_AGENT_URL não configurada; pulando impressão.');
    return { skipped: true };
  }

  const body = {
    job_id: jobId,
    pdf_base64: pdfBase64,
    printer: PRINTER_NAME, // se vazio, o agente usa a padrão
    copies: 1,
    duplex: false,
    paper: 'A4'
  };

  const json = JSON.stringify(body);
  const headers = { 'Content-Type': 'application/json' };

  if (PRINT_AGENT_SECRET) {
    const hmac = 'sha256=' + crypto.createHmac('sha256', PRINT_AGENT_SECRET).update(json).digest('hex');
    headers['X-Agent-Signature'] = hmac;
  }

  const { data } = await axios.post(PRINT_AGENT_URL, body, { headers, timeout: 15000 });
  return data;
}
