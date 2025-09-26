// src/oficio.js
import fs from 'fs';
import path from 'path';

const baseDir = process.env.DATA_DIR || process.cwd();

export async function gerarOficioHTML(registro) {
  const protocolo = registro.protocolo;
  const data = new Date(registro.data_hora).toLocaleString('pt-BR');
  const html = `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8">
<title>Ofício ${protocolo}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;margin:40px;line-height:1.5}
.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #222;padding-bottom:10px;margin-bottom:24px}
.brasao{width:64px;height:64px;background:#eee;display:inline-block;border-radius:8px}
h1{font-size:18px;margin:0}.meta{font-size:12px;color:#444}
.box{border:1px solid #ccc;border-radius:8px;padding:16px;margin-top:12px}.label{font-weight:bold}
.signature{margin-top:40px}.signature .line{width:260px;height:1px;background:#000;margin-top:40px}
</style></head><body>
<div class="header"><div class="brasao"></div><div>
<h1>Gabinete – Ofício Automatizado</h1>
<div class="meta">Protocolo: <strong>${protocolo}</strong> &nbsp;|&nbsp; Data: ${data}</div>
</div></div>
<p>Encaminhamos a solicitação recebida via WhatsApp Business para análise e providências.</p>
<div class="box"><div><span class="label">Nome:</span> ${registro.nome || 'Munícipe'}</div><div><span class="label">Telefone:</span> ${registro.telefone || ''}</div></div>
<h2>Descrição da demanda</h2><div class="box">${registro.descricao || ''}</div>
</body></html>`;
  const filePath = path.join(baseDir, `oficio_${protocolo}.html`);
  fs.writeFileSync(filePath, html, { encoding: 'utf-8' });
  return filePath;
}

// NOVO: gera PDF a partir do HTML
export async function gerarPDFDoOficio(htmlPath) {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Caminho file:// com barras
  const url = 'file://' + htmlPath.replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'networkidle0' });

  const pdfPath = htmlPath.replace(/\.html?$/i, '.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
  });

  await browser.close();
  return pdfPath;
}
