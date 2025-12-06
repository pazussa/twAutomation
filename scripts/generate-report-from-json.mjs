/**
 * Script para generar reporte HTML desde el JSON ordenado
 * Usa el mismo formato que conversation-reporter.ts y server.ts
 */

import fs from 'fs';
import path from 'path';

const EXECUTION_ID = '496810a435e88506';
const JSON_FILE = `conversation-${EXECUTION_ID}-ordenada-cebada.json`;
const OUTPUT_DIR = 'test-results/conversations';

console.log('🔄 Generando reporte desde JSON ordenado...\n');

// Leer JSON
const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const totalEntries = Array.isArray(data.conversation) ? data.conversation.length : Object.keys(data.conversation).filter(k => data.conversation[k] !== null).length;
console.log(`📂 Cargado: ${JSON_FILE}`);
console.log(`   Entradas: ${totalEntries}`);

// Función para escapar HTML
function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Construir grupos por intent
const groups = [];

// Iterar sobre valores del objeto (no es array)
const entries = Array.isArray(data.conversation) ? data.conversation : Object.values(data.conversation).filter(e => e !== null);

for (const entry of entries) {
  // Construir eventos desde los mensajes, respetando el ok original de cada mensaje
  const events = [];
  let hasAnyFail = false;
  
  if (entry.messages && Array.isArray(entry.messages)) {
    for (const msg of entry.messages) {
      const kind = msg.role === 'user' || msg.type === 'send' ? 'send' : 'recv';
      const text = msg.content || msg.text || '';
      const ok = msg.ok === true; // Respetar el valor original del mensaje
      const t = msg.time || msg.t || Date.now();
      events.push({ kind, text, ok, t });
      
      if (!ok) hasAnyFail = true;
    }
  }
  
  // Si cualquier mensaje tiene ok:false, la frase entera es FAIL
  const status = hasAnyFail ? 'fail' : 'ok';
  
  groups.push({
    label: `[${entry.index}/940] ${entry.intent} › ${entry.phrase}`,
    idx: entry.index,
    total: 940,
    events,
    status
  });
}

// Calcular estadísticas
const intentStats = groups.map(g => {
  const intentPhrases = g.events.filter(e => e.kind === 'send' || e.kind === 'recv');
  const intentPassed = intentPhrases.filter(e => e.ok).length;
  const intentTotal = intentPhrases.length;
  const intentSuccessRate = intentTotal > 0 ? ((intentPassed / intentTotal) * 100).toFixed(1) : '0.0';
  return { ...g, intentPassed, intentTotal, intentSuccessRate };
});

const totalIntents = groups.length;
const okCount = groups.filter(g => g.status === 'ok').length;
const failCount = groups.filter(g => g.status === 'fail').length;
const successRate = ((okCount / totalIntents) * 100).toFixed(1);

console.log(`\n📊 Estadísticas:`);
console.log(`   OK: ${okCount}`);
console.log(`   FAIL: ${failCount}`);
console.log(`   Tasa: ${successRate}%`);

// Generar HTML con el formato original
const groupsHtml = intentStats.map(g => {
  const rows = g.events.length
    ? g.events.map((ev, i) => {
        const colTime = ev.t ? new Date(ev.t).toLocaleTimeString('es-CO', { 
          timeZone: 'America/Bogota', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        }) : '--:--';
        const tipo = ev.kind === 'send' ? 'Enviado' : ev.kind === 'recv' ? 'Recibido' : 'Intent';
        const badge = ev.ok
          ? '<span class="badge ok">OK</span>'
          : '<span class="badge fail">FAIL</span>';
        return `<tr data-timestamp="${ev.t}">
  <td class="idx">${i + 1}</td>
  <td class="tipo ${ev.kind}">${tipo}</td>
  <td class="texto">${esc((ev.text || '').replace(/\s+/g, ' ').trim())}</td>
  <td class="time">${colTime}</td>
  <td class="estado">${badge}</td>
</tr>`;
      }).join('\n')
    : '<tr><td colspan="5" style="color:#64748b">Sin eventos en este intent</td></tr>';

  const chipClass = g.status === 'ok' ? 'ok' : 'fail';
  const chipText = g.status === 'ok' ? 'OK' : 'FAIL';

  return `<div class="intent-card">
  <div class="intent-header">
    <div class="intent-title">${esc(g.label)} <span class="intent-sub">(${g.idx}/${g.total})</span></div>
    <div class="intent-stats">
      <span class="chip success-rate">Éxito: ${g.intentSuccessRate}% (${g.intentPassed}/${g.intentTotal})</span>
      <span class="chip ${chipClass}">${chipText}</span>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Tipo</th><th>Texto</th><th>Hora</th><th>Resultado</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}).join('\n');

// Determinar el sufijo del título
const reportSuffix = process.argv[2] || '';
const reportTitle = reportSuffix ? `Ejecución ${EXECUTION_ID} - ${reportSuffix}` : `Ejecución ${EXECUTION_ID}`;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${reportTitle}</title>
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
  .chip.success-rate{border-color:#8b5cf6;color:#8b5cf6;background:rgba(139,92,246,.08)}
  .chip.total-events{border-color:#0ea5e9;color:#0ea5e9;background:rgba(14,165,233,.08)}
  .stats-summary{display:flex;flex-direction:column;gap:12px;margin:12px 0;}
  .stat-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);}
  .stat-item:last-child{border-bottom:none;}
  .stat-label{font-weight:500;color:#374151;}
  .stat-value{font-weight:700;font-size:18px;color:#1f2937;}
  .stat-item.success .stat-value{color:var(--ok);}
  .stat-item.fail .stat-value{color:var(--fail);}
  h3{margin:16px 0 8px;font-size:14px;}
  footer{margin-top:16px;color:#64748b;font-size:12px}
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
  .intent-stats{display:flex;gap:8px;align-items:center}
  footer{margin-top:16px;color:#64748b;font-size:12px}
</style>
</head>
<body>
  <div class="card">
    <h1>${reportTitle}</h1>
    <div class="meta">
      <div><strong>Estado:</strong> Finalizado</div>
      <div><strong>Eventos registrados:</strong> ${groups.reduce((acc, g) => acc + g.events.length, 0)}</div>
    </div>
    <div class="summary">
      <div class="chip total-events">Total Intents: ${totalIntents}</div>
      <div class="chip ok">Intents OK: ${okCount}</div>
      <div class="chip fail">Intents FAIL: ${failCount}</div>
      <div class="chip success-rate">Éxito: ${successRate}%</div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin:0 0 8px;font-size:16px">Conversación por intent</h2>
    ${groupsHtml}
  </div>

  <div class="card">
    <h2 style="margin:0 0 12px;font-size:16px">📊 Estadísticas de Ejecución</h2>
    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-label">Total Frases (Intents):</span>
        <span class="stat-value">${totalIntents}</span>
      </div>
      <div class="stat-item success">
        <span class="stat-label">Frases Procesadas Correctamente:</span>
        <span class="stat-value">${okCount}</span>
      </div>
      <div class="stat-item fail">
        <span class="stat-label">Frases con Errores:</span>
        <span class="stat-value">${failCount}</span>
      </div>
    </div>
    
    <footer>Generado desde JSON ordenado - ${new Date().toISOString()}</footer>
  </div>
</body>
</html>`;

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Guardar HTML
const htmlPath = path.join(OUTPUT_DIR, reportSuffix ? `Ejecucion-${EXECUTION_ID}-${reportSuffix}.html` : `Ejecucion-${EXECUTION_ID}.html`);
fs.writeFileSync(htmlPath, html);
console.log(`\n✅ HTML guardado: ${htmlPath}`);
console.log(`\n📄 Para generar PDF:`);
console.log(`   node scripts/export-report-to-pdf.mjs ${htmlPath}`);
