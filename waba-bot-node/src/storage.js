import fs from 'fs';
import path from 'path';
const baseDir = process.env.DATA_DIR || process.cwd();
const csvPath = path.join(baseDir, 'registro_atendimentos.csv');

export async function writeRegistro(item) {
  const headers = ['protocolo','data_hora','nome','telefone','descricao','anexos_json'];
  const exists = fs.existsSync(csvPath);
  const safe = s => `"${String(s ?? '').replace(/\n/g,' ').replace(/\r/g,' ').replace(/"/g,'\"')}"`;
  const line = [
    item.protocolo, item.data_hora, safe(item.nome), safe(item.telefone), safe(item.descricao),
    JSON.stringify(item.anexos || [])
  ].join(',') + '\n';
  if (!exists) fs.writeFileSync(csvPath, headers.join(',') + '\n', { encoding: 'utf-8' });
  fs.appendFileSync(csvPath, line, { encoding: 'utf-8' });
  return csvPath;
}
