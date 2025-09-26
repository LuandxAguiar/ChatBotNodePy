// src/index.js
import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs/promises';

import { writeRegistro } from './storage.js';
import { gerarOficioHTML, gerarPDFDoOficio } from './oficio.js';
import { enviarParaImpressaoBase64 } from './printAgent.js';

dotenv.config();

// >>> AQUI criamos o app ANTES de usar app.get/app.post <<<
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'dev-verify';
const API_VERSION = process.env.WABA_API_VERSION || 'v20.0';
const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID || '';
const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN || '';

// Verificação do webhook (Meta)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Recebe mensagens do WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    const from = messages?.[0]?.from;
    const text = messages?.[0]?.text?.body;
    const name = value?.contacts?.[0]?.profile?.name || 'Munícipe';

    if (from && text) {
      const now = new Date();
      const protocolo = `${now.toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(16).slice(2,10).toUpperCase()}`;

      const registro = {
        protocolo,
        data_hora: now.toISOString(),
        nome: name,
        telefone: from,
        descricao: text,
        anexos: []
      };

      // 1) registra
      await writeRegistro(registro);

      // 2) gera HTML
      const oficioHtmlPath = await gerarOficioHTML(registro);

      // 3) gera PDF
      const pdfPath = await gerarPDFDoOficio(oficioHtmlPath);

      // 4) lê PDF e envia ao Agente Local (impressão)
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfBase64 = pdfBuffer.toString('base64');
      const respAgente = await enviarParaImpressaoBase64(pdfBase64, protocolo);
      console.log('Impressão enviada ao agente:', respAgente);

      // 5) responde ao usuário
      await sendText(from, `Recebemos sua mensagem. Protocolo: ${protocolo}.`);
    }

    res.sendStatus(200); // sempre 200 p/ evitar reentregas
  } catch (err) {
    console.error('Erro no webhook:', err?.response?.data || err);
    res.sendStatus(200);
  }
});

app.get('/', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Envio de texto pelo WhatsApp
async function sendText(to, body) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn('WABA_PHONE_NUMBER_ID/ACCESS_TOKEN ausentes. Simulando envio.');
    return;
  }
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const payload = { messaging_product: "whatsapp", to, type: "text", text: { body } };
  await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
  });
}

app.listen(PORT, () => {
  console.log(`WABA bot rodando em http://localhost:${PORT}`);
});
