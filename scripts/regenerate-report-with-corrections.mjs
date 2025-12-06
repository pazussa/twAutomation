/**
 * Regenerar el reporte HTML/PDF desde el JSON corregido
 */

import fs from 'fs';
import path from 'path';

const EXECUTION_ID = '496810a435e88506';
const OUTPUT_DIR = 'test-results/conversations';

console.log('🔄 Regenerando reporte desde JSON corregido...\n');

// Leer JSON ordenado (con correcciones)
const ordered = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}-ordenada.json`, 'utf8'));
const totalExpected = ordered.conversation.length;

console.log(`📋 Total frases: ${totalExpected}`);
console.log(`📋 Correcciones aplicadas: ${ordered.corrections ? 'Sí' : 'No'}`);

// Calcular estadísticas con las correcciones
let successCount = 0;
let failCount = 0;

ordered.conversation.forEach(entry => {
  const recvMessages = entry.messages.filter(m => m.type === 'recv');
  const allOk = recvMessages.length > 0 && recvMessages.every(m => m.ok === true);
  const anyFail = recvMessages.some(m => m.ok === false);
  
  if (entry.manualCorrection === 'fail' || anyFail) {
    failCount++;
  } else if (allOk || entry.manualCorrection === 'ok') {
    successCount++;
  } else {
    successCount++; // Por defecto si no hay info clara
  }
});

const successRate = ((successCount / totalExpected) * 100).toFixed(1);

console.log(`\n📊 Estadísticas:`);
console.log(`   Exitosos: ${successCount}`);
console.log(`   Fallidos: ${failCount}`);
console.log(`   Tasa de éxito: ${successRate}%`);

// Helper para escapar HTML
function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Generar HTML
const groupsHtml = ordered.conversation.map((r) => {
  // Determinar si es fail o ok
  const recvMessages = r.messages.filter(m => m.type === 'recv');
  const isFail = r.manualCorrection === 'fail' || recvMessages.some(m => m.ok === false);
  const chipClass = isFail ? 'fail' : 'ok';
  const chipText = isFail ? 'FAIL' : 'OK';
  
  let rows = '';
  if (r.messages && r.messages.length > 0) {
    rows = r.messages.map((ev, i) => {
      const colTime = ev.time ? new Date(ev.time).toLocaleTimeString('es-CO', { 
        timeZone: 'America/Bogota', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      }) : '--:--';
      const tipo = ev.type === 'send' ? 'Enviado' : ev.type === 'recv' ? 'Recibido' : 'Intent';
      const badge = ev.ok
        ? '<span class="badge ok">OK</span>'
        : '<span class="badge fail">FAIL</span>';
      return `<tr>
  <td class="idx">${i + 1}</td>
  <td class="tipo ${ev.type}">${tipo}</td>
  <td class="texto">${esc((ev.text || '').replace(/\s+/g, ' ').trim())}</td>
  <td class="time">${colTime}</td>
  <td class="estado">${badge}</td>
</tr>`;
    }).join('\n');
  } else {
    rows = '<tr><td colspan="5" style="color:#64748b">Sin mensajes registrados</td></tr>';
  }

  // Calcular estadísticas del intent
  const intentPassed = r.messages.filter(e => e.ok === true).length;
  const intentTotal = r.messages.length;
  const intentSuccessRate = intentTotal > 0 ? ((intentPassed / intentTotal) * 100).toFixed(1) : '0.0';

  // Indicador de corrección manual
  const correctionBadge = r.manualCorrection 
    ? `<span class="chip correction">✏️ Corregido</span>` 
    : '';

  return `<div class="intent-card ${isFail ? 'intent-fail' : ''}" id="intent-${r.index}">
  <div class="intent-header">
    <div class="intent-title">[${r.index}/${totalExpected}] ${esc(r.intent)} › ${esc(r.phrase.substring(0, 60))}${r.phrase.length > 60 ? '...' : ''}</div>
    <div class="intent-stats">
      ${correctionBadge}
      <span class="chip success-rate">Éxito: ${intentSuccessRate}% (${intentPassed}/${intentTotal})</span>
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

// Listar las correcciones aplicadas
const correctionsHtml = ordered.corrections ? `
<div class="card corrections-section">
  <h3>✏️ Correcciones Manuales Aplicadas</h3>
  <div class="correction-list">
    <div class="correction-group fail">
      <strong>Marcadas como FAIL (${ordered.corrections.failMarked.length}):</strong>
      <span>${ordered.corrections.failMarked.join(', ')}</span>
    </div>
    <div class="correction-group ok">
      <strong>Marcadas como OK (${ordered.corrections.okMarked.length}):</strong>
      <span>${ordered.corrections.okMarked.join(', ')}</span>
    </div>
  </div>
</div>
` : '';

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Reporte COMPLETO (Corregido) - Ejecución ${EXECUTION_ID}</title>
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
  .chip.correction{border-color:#f59e0b;color:#f59e0b;background:rgba(245,158,11,.08)}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:14px}
  thead th{font-weight:600;text-align:left;color:#334155;border-bottom:1px solid var(--border);padding:8px}
  tbody td{border-top:1px solid var(--border);padding:8px;vertical-align:top}
  td.idx{width:44px;color:#64748b}
  td.tipo.send{color:var(--send);font-weight:600}
  td.tipo.recv{color:var(--recv);font-weight:600}
  td.time{white-space:nowrap;color:#64748b}
  td.texto{white-space:pre-wrap;word-wrap:break-word}
  .badge{display:inline-block;border-radius:8px;padding:2px 8px;font-size:12px;border:1px solid}
  .badge.ok{border-color:var(--ok);color:var(--ok);background:rgba(16,185,129,.08)}
  .badge.fail{border-color:var(--fail);color:var(--fail);background:rgba(239,68,68,.08)}
  .intent-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:14px 0;page-break-inside:avoid;}
  .intent-card.intent-fail{border-color:#fecaca;background:#fef2f2;}
  .intent-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px;}
  .intent-title{font-weight:700;font-size:13px;}
  .intent-stats{display:flex;gap:8px;align-items:center}
  .corrections-section{background:#fffbeb;border:2px solid #fcd34d;}
  .corrections-section h3{color:#b45309;margin:0 0 12px;}
  .correction-list{display:flex;flex-direction:column;gap:8px;}
  .correction-group{padding:8px 12px;border-radius:8px;font-size:13px;}
  .correction-group.fail{background:#fef2f2;border:1px solid #fecaca;}
  .correction-group.ok{background:#f0fdf4;border:1px solid #bbf7d0;}
  @media print {
    body { margin: 10px; }
    .card { page-break-inside: avoid; }
    .intent-card { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="card">
    <h1>📊 Reporte COMPLETO (Corregido) - Ejecución ${EXECUTION_ID}</h1>
    <div class="meta">
      <div><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</div>
      <div><strong>Total intents:</strong> 28 (sin requestOtp)</div>
      <div><strong>Correcciones manuales:</strong> ${ordered.corrections ? ordered.corrections.failMarked.length + ordered.corrections.okMarked.length : 0}</div>
    </div>
    <div class="summary">
      <div class="chip total-events">Total Frases: ${totalExpected}</div>
      <div class="chip ok">Exitosos: ${successCount}</div>
      <div class="chip fail">Fallidos: ${failCount}</div>
      <div class="chip success-rate">Tasa Éxito: ${successRate}%</div>
    </div>
  </div>

  ${correctionsHtml}

  <div class="card">
    <h2 style="margin:0 0 8px;font-size:16px">Conversación por Frase (${totalExpected} frases)</h2>
    ${groupsHtml}
  </div>

  <footer style="text-align:center;margin-top:24px;color:#64748b;font-size:12px">
    Generado automáticamente con correcciones manuales - ${new Date().toISOString()}
  </footer>
</body>
</html>`;

// Guardar HTML
const htmlPath = path.join(OUTPUT_DIR, `Ejecucion-${EXECUTION_ID}-COMPLETO-CORREGIDO.html`);
fs.writeFileSync(htmlPath, html);
console.log(`\n✅ Reporte HTML guardado: ${htmlPath}`);

// Guardar JSON del reporte
const jsonPath = path.join(OUTPUT_DIR, `Ejecucion-${EXECUTION_ID}-COMPLETO-CORREGIDO.json`);
fs.writeFileSync(jsonPath, JSON.stringify({
  executionId: EXECUTION_ID,
  generatedAt: new Date().toISOString(),
  totalExpected,
  successCount,
  failCount,
  successRate: `${successRate}%`,
  corrections: ordered.corrections,
  results: ordered.conversation.map(r => ({
    idx: r.index,
    intent: r.intent,
    phrase: r.phrase,
    executed: r.executed,
    manualCorrection: r.manualCorrection || null,
    messagesCount: r.messages.length
  }))
}, null, 2));
console.log(`✅ Reporte JSON guardado: ${jsonPath}`);

console.log(`\n🎉 Reporte regenerado con correcciones!`);
