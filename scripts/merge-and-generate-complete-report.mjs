/**
 * Fusionar la conversación de frases faltantes con la original
 * y regenerar el reporte completo
 */

import fs from 'fs';
import path from 'path';

const EXECUTION_ID = '496810a435e88506';
const MISSING_CONV = 'conversation-1764247093005.json';
const OUTPUT_DIR = 'test-results/conversations';

console.log('🔄 Fusionando conversaciones...\n');

// Leer conversación original
const originalConv = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}.json`, 'utf8'));
console.log(`📋 Conversación original: ${originalConv.events.length} eventos`);

// Leer conversación de faltantes
const missingConv = JSON.parse(fs.readFileSync(MISSING_CONV, 'utf8'));
console.log(`📋 Conversación faltantes: ${missingConv.events.length} eventos`);

// Fusionar
const mergedConv = {
  ...originalConv,
  events: [...originalConv.events, ...missingConv.events]
};

console.log(`📋 Conversación fusionada: ${mergedConv.events.length} eventos`);

// Guardar backup y fusionada
fs.copyFileSync(`conversation-${EXECUTION_ID}.json`, `conversation-${EXECUTION_ID}-before-merge.json`);
fs.writeFileSync(`conversation-${EXECUTION_ID}.json`, JSON.stringify(mergedConv, null, 2));
console.log(`✅ Conversación actualizada: conversation-${EXECUTION_ID}.json`);

// Ahora regenerar el reporte
console.log('\n🔄 Regenerando reporte final...\n');

// Leer temp-exec original
const tempExec = JSON.parse(fs.readFileSync(`temp-exec-${EXECUTION_ID}-original.json`, 'utf8'));
const totalExpected = tempExec.examples.length;
console.log(`📋 Total frases en temp-exec: ${totalExpected}`);

// Crear mapa de frase -> eventos de ejecución
const phraseExecutions = new Map();

let currentIntentEvents = null;
mergedConv.events.forEach(event => {
  if (event.kind === 'intent') {
    if (currentIntentEvents) {
      const match = currentIntentEvents.intent.text.match(/ › (.+)/);
      if (match) {
        const phrase = match[1].trim();
        if (!phraseExecutions.has(phrase)) {
          phraseExecutions.set(phrase, []);
        }
        phraseExecutions.get(phrase).push(currentIntentEvents);
      }
    }
    currentIntentEvents = {
      intent: event,
      messages: []
    };
  } else if (currentIntentEvents) {
    currentIntentEvents.messages.push(event);
  }
});
if (currentIntentEvents) {
  const match = currentIntentEvents.intent.text.match(/ › (.+)/);
  if (match) {
    const phrase = match[1].trim();
    if (!phraseExecutions.has(phrase)) {
      phraseExecutions.set(phrase, []);
    }
    phraseExecutions.get(phrase).push(currentIntentEvents);
  }
}

// Construir reporte ordenado según temp-exec
const orderedResults = [];
const usedExecutions = new Map();

tempExec.examples.forEach((ex, idx) => {
  const executions = phraseExecutions.get(ex.example);
  const usedCount = usedExecutions.get(ex.example) || 0;
  
  let execution = null;
  if (executions && executions.length > usedCount) {
    execution = executions[usedCount];
    usedExecutions.set(ex.example, usedCount + 1);
  }
  
  orderedResults.push({
    idx: idx + 1,
    intent: ex.intent,
    phrase: ex.example,
    executed: !!execution,
    execution
  });
});

// Estadísticas
const executed = orderedResults.filter(r => r.executed).length;
const missing = orderedResults.filter(r => !r.executed);
const successRate = (executed / totalExpected * 100).toFixed(1);

console.log(`\n${'='.repeat(60)}`);
console.log('ESTADÍSTICAS FINALES');
console.log('='.repeat(60));
console.log(`Total frases esperadas: ${totalExpected}`);
console.log(`Frases ejecutadas: ${executed}`);
console.log(`Frases faltantes: ${missing.length}`);
console.log(`Cobertura: ${successRate}%`);

// Helper para escapar HTML
function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Generar HTML
console.log(`\n📝 Generando reporte HTML...`);

const groupsHtml = orderedResults.map((r, groupIdx) => {
  const chipClass = r.executed ? 'ok' : 'fail';
  const chipText = r.executed ? 'OK' : 'FALTA';
  
  let rows = '';
  if (r.execution && r.execution.messages.length > 0) {
    rows = r.execution.messages.map((ev, i) => {
      const colTime = new Date(ev.t).toLocaleTimeString('es-CO', { 
        timeZone: 'America/Bogota', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
      const tipo = ev.kind === 'send' ? 'Enviado' : ev.kind === 'recv' ? 'Recibido' : 'Intent';
      const badge = ev.ok
        ? '<span class="badge ok">OK</span>'
        : '<span class="badge fail">FAIL</span>';
      return `<tr>
  <td class="idx">${i + 1}</td>
  <td class="tipo ${ev.kind}">${tipo}</td>
  <td class="texto">${esc((ev.text || '').replace(/\s+/g, ' ').trim())}</td>
  <td class="time">${colTime}</td>
  <td class="estado">${badge}</td>
</tr>`;
    }).join('\n');
  } else if (!r.executed) {
    rows = '<tr><td colspan="5" style="color:#dc2626;text-align:center;padding:20px;">❌ Esta frase NO fue ejecutada</td></tr>';
  } else {
    rows = '<tr><td colspan="5" style="color:#64748b">Sin mensajes registrados</td></tr>';
  }

  const intentPhrases = r.execution?.messages.filter(e => e.kind === 'send' || e.kind === 'recv') || [];
  const intentPassed = intentPhrases.filter(e => e.ok).length;
  const intentTotal = intentPhrases.length;
  const intentSuccessRate = intentTotal > 0 ? ((intentPassed / intentTotal) * 100).toFixed(1) : '0.0';

  return `<div class="intent-card" id="intent-${r.idx}">
  <div class="intent-header">
    <div class="intent-title">[${r.idx}/${totalExpected}] ${esc(r.intent)} › ${esc(r.phrase.substring(0, 60))}${r.phrase.length > 60 ? '...' : ''}</div>
    <div class="intent-stats">
      ${r.executed ? `<span class="chip success-rate">Éxito: ${intentSuccessRate}% (${intentPassed}/${intentTotal})</span>` : ''}
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

// Agrupar faltantes por intent
const missingByIntent = {};
missing.forEach(m => {
  if (!missingByIntent[m.intent]) missingByIntent[m.intent] = [];
  missingByIntent[m.intent].push(m);
});

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Reporte COMPLETO - Ejecución ${EXECUTION_ID}</title>
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
  .complete-badge{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:8px 16px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;margin:10px 0}
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
  .intent-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:14px 0;page-break-inside:avoid;}
  .intent-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px;}
  .intent-title{font-weight:700;font-size:13px;}
  .intent-stats{display:flex;gap:8px;align-items:center}
  .missing-section{background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0;}
  .missing-section h3{color:#dc2626;margin:0 0 12px;}
  .missing-intent{margin:8px 0;padding:8px;background:#fff;border-radius:8px;border:1px solid #fecaca;}
  .missing-intent-name{font-weight:600;color:#991b1b;}
  .missing-phrases{margin-top:8px;padding-left:16px;font-size:13px;color:#374151;}
  @media print {
    body { margin: 10px; }
    .card { page-break-inside: avoid; }
    .intent-card { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="card">
    <h1>📊 Reporte COMPLETO - Ejecución ${EXECUTION_ID}</h1>
    <div class="meta">
      <div><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</div>
      <div><strong>Total intents:</strong> 28 (sin requestOtp)</div>
    </div>
    ${executed === totalExpected ? '<div class="complete-badge">✅ 100% COMPLETADO</div>' : ''}
    <div class="summary">
      <div class="chip total-events">Total Frases: ${totalExpected}</div>
      <div class="chip ok">Ejecutadas: ${executed}</div>
      ${missing.length > 0 ? `<div class="chip fail">Faltantes: ${missing.length}</div>` : ''}
      <div class="chip success-rate">Cobertura: ${successRate}%</div>
    </div>
  </div>

  ${missing.length > 0 ? `
  <div class="card missing-section">
    <h3>❌ Frases Faltantes por Intent (${missing.length} total)</h3>
    ${Object.entries(missingByIntent).map(([intent, items]) => `
      <div class="missing-intent">
        <div class="missing-intent-name">${esc(intent)}: ${items.length} frases</div>
        <div class="missing-phrases">
          ${items.slice(0, 5).map(m => `[${m.idx}] ${esc(m.phrase.substring(0, 50))}...`).join('<br>')}
          ${items.length > 5 ? `<br><em>... y ${items.length - 5} más</em>` : ''}
        </div>
      </div>
    `).join('')}
  </div>` : ''}

  <div class="card">
    <h2 style="margin:0 0 8px;font-size:16px">Conversación por Frase (${totalExpected} frases)</h2>
    ${groupsHtml}
  </div>

  <footer style="text-align:center;margin-top:24px;color:#64748b;font-size:12px">
    Generado automáticamente - ${new Date().toISOString()}
  </footer>
</body>
</html>`;

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Guardar HTML
const htmlPath = path.join(OUTPUT_DIR, `Ejecucion-${EXECUTION_ID}-COMPLETO.html`);
fs.writeFileSync(htmlPath, html);
console.log(`✅ Reporte HTML guardado: ${htmlPath}`);

// Guardar también JSON con los resultados
const jsonPath = path.join(OUTPUT_DIR, `Ejecucion-${EXECUTION_ID}-COMPLETO.json`);
fs.writeFileSync(jsonPath, JSON.stringify({
  executionId: EXECUTION_ID,
  generatedAt: new Date().toISOString(),
  totalExpected,
  executed,
  missing: missing.length,
  coverage: successRate,
  results: orderedResults.map(r => ({
    idx: r.idx,
    intent: r.intent,
    phrase: r.phrase,
    executed: r.executed,
    messagesCount: r.execution?.messages.length || 0
  }))
}, null, 2));
console.log(`✅ Reporte JSON guardado: ${jsonPath}`);

console.log(`\n🎉 Reporte COMPLETO generado!`);
console.log(`   Cobertura: ${successRate}% (${executed}/${totalExpected})`);
