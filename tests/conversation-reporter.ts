import fs from 'node:fs';
import path from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

type ConvEvent = { t: number; kind: 'send' | 'recv' | 'intent'; text: string; ok: boolean; meta?: any };
type ConvPayload = { title: string; events: ConvEvent[] };

function sanitize(name: string) {
  return name.replace(/[^\w\-]+/g, '_').slice(0, 150);
}
function esc(s: string) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default class ConversationReporter implements Reporter {
  private outputDir: string;

  constructor(options?: { outputDir?: string }) {
    this.outputDir =
      options?.outputDir || path.join(process.cwd(), 'test-results', 'conversations');
  }

  onBegin() {
    fs.mkdirSync(this.outputDir, { recursive: true });
    const indexPath = path.join(this.outputDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Conversaciones - Reporte</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Arial,sans-serif;margin:24px;}
  h1{font-size:22px;margin:0 0 12px;}
  ul{line-height:1.8}
</style>
</head>
<body>
  <h1>Reportes de Conversación</h1>
  <p>Los archivos HTML se generan por cada test en esta carpeta.</p>
  <ul id="hint"><li>Abre cualquier <code>.html</code> para ver los pasos (enviado/recibido) con estado OK/FAIL.</li></ul>
</body>
</html>`);
    }
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    const att = result.attachments?.find(
      (a) => a.name === 'conversation' && a.contentType === 'application/json'
    );
    if (!att) return;

    let payload: ConvPayload | null = null;
    try {
      if (att.path) payload = JSON.parse(fs.readFileSync(att.path, 'utf-8'));
      else if (att.body) payload = JSON.parse(Buffer.from(att.body).toString('utf-8'));
    } catch { return; }
    if (!payload) return;

    // Agregar fecha y hora al nombre del archivo
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
    const fileBase = `${sanitize(test.title)}.${timestamp}.${sanitize(result.status)}`;
    const htmlPath = path.join(this.outputDir, `${fileBase}.html`);

    // Agrupar por INTENT (si no hay, un solo grupo)
    const groups: Array<{ label: string; idx: number; total: number; events: ConvEvent[] }> = [];
    let current: { label: string; idx: number; total: number; events: ConvEvent[] } | null = null;

    const totalIntentsInPayload = payload.events.filter(e => e.kind === 'intent').length;

    for (const ev of payload.events) {
      if (ev.kind === 'intent') {
        if (current) groups.push(current);
        const idx = (ev.meta?.idx ?? groups.length + 1);
        const total = (ev.meta?.total ?? totalIntentsInPayload) || (groups.length + 1);
        current = { label: ev.text || `Intent ${idx}`, idx, total, events: [] };
        continue;
      }
      if (!current) {
        current = { label: `Intent 1`, idx: 1, total: totalIntentsInPayload || 1, events: [] };
      }
      current.events.push(ev);
    }
    if (current) groups.push(current);
    if (groups.length === 0) {
      groups.push({ label: 'Intent 1', idx: 1, total: 1, events: payload.events || [] });
    }

    const groupSummaries = groups.map(g => {
      const failed = g.events.some(e => e.ok === false);
      const status = failed ? 'fail' : 'ok';
      return { ...g, status };
    });

    const overallTotal = payload.events?.length || 0;
    const passed = payload.events?.filter(e => e.ok).length || 0;
    const failed = overallTotal - passed;

    const groupsHtml = groupSummaries.map(g => {
      const rows = g.events.length
        ? g.events.map((ev, i) => {
            const iso = new Date(ev.t).toISOString();
            const tipo = ev.kind === 'send' ? 'Enviado' : ev.kind === 'recv' ? 'Recibido' : 'Intent';
            const badge = ev.ok
              ? '<span class="badge ok">OK</span>'
              : '<span class="badge fail">FAIL</span>';
            return `<tr>
  <td class="idx">${i + 1}</td>
  <td class="tipo ${ev.kind}">${tipo}</td>
  <td class="texto">${esc((ev.text || '').replace(/\s+/g, ' ').trim())}</td>
  <td class="time">${iso}</td>
  <td class="estado">${badge}</td>
</tr>`;
          }).join('\n')
        : '<tr><td colspan="5" style="color:#64748b">Sin eventos en este intent</td></tr>';

      const chipClass = g.status === 'ok' ? 'ok' : 'fail';
      const chipText = g.status === 'ok' ? 'OK' : 'FAIL';

      return `<div class="intent-card">
  <div class="intent-header">
    <div class="intent-title">${esc(g.label)} <span class="intent-sub">(${g.idx}/${g.total})</span></div>
    <div class="chip ${chipClass}">${chipText}</div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Tipo</th><th>Texto</th><th>Timestamp (UTC)</th><th>Resultado</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
    }).join('\n');

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${esc(test.title)} – ${result.status.toUpperCase()}</title>
<style>
  :root {
    --ok: #10b981;
    --fail: #ef4444;
    --send: #1d4ed8;
    --recv: #6b7280;
    --bg: #f8fafc;
    --card: #ffffff;
    --border: #e5e7eb;
  }
  html,body{background:var(--bg);}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Arial,sans-serif;margin:24px;color:#0f172a;}
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.05);padding:18px 20px;margin-bottom:18px;}
  h1{font-size:20px;margin:0 0 4px;}
  .meta{color:#475569;margin:0 0 12px;font-size:14px}
  .summary{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0 0}
  .chip{border:1px solid var(--border);border-radius:999px;padding:6px 10px;font-size:13px;background:#fff}
  .chip.ok{border-color:var(--ok);color:var(--ok)}
  .chip.fail{border-color:var(--fail);color:var(--fail)}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:14px}
  thead th{font-weight:600;text-align:left;color:#334155;border-bottom:1px solid var(--border);padding:8px}
  tbody td{border-top:1px solid var(--border);padding:8px;vertical-align:top}
  td.idx{width:44px;color:#64748b}
  td.tipo.send{color:var(--send);font-weight:600}
  td.tipo.recv{color:var(--recv);font-weight:600}
  td.tipo.intent{color:#7c3aed;font-weight:700}
  td.time{white-space:nowrap;color:#64748b}
  td.texto{white-space:pre-wrap;word-wrap:break-word}
  .badge{display:inline-block;border-radius:8px;padding:2px 8px;font-size:12px;border:1px solid}
  .badge.ok{border-color:var(--ok);color:var(--ok);background:rgba(16,185,129,.08)}
  .badge.fail{border-color:var(--fail);color:var(--fail);background:rgba(239,68,68,.08)}
  .intent-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:14px 0}
  .intent-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .intent-title{font-weight:700}
  .intent-sub{color:#64748b;font-weight:500;margin-left:6px}
  footer{margin-top:16px;color:#64748b;font-size:12px}
</style>
</head>
<body>
  <div class="card">
    <h1>${esc(test.title)}</h1>
    <div class="meta">
      <div><strong>Status:</strong> ${esc(result.status)}</div>
      <div><strong>Duración:</strong> ${Math.round(result.duration)} ms</div>
      <div><strong>Archivo:</strong> ${esc(test.location.file)}:${test.location.line}</div>
    </div>
    <div class="summary">
      <div class="chip">Eventos: ${overallTotal}</div>
      <div class="chip ok">OK: ${passed}</div>
      <div class="chip fail">FAIL: ${failed}</div>
      <div class="chip">Intents: ${groupSummaries.length}</div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin:0 0 8px;font-size:16px">Conversación por intent</h2>
    ${groupsHtml}
    <footer>Generado por ConversationReporter</footer>
  </div>
</body>
</html>`;

    fs.writeFileSync(htmlPath, html, 'utf-8');
  }
}
