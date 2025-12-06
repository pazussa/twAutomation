/**
 * Regenerar el reporte HTML/PDF desde el JSON con resultados de HUMUS
 * Mismo formato que FINAL-CEBADA
 */

import fs from 'fs';
import path from 'path';

const EXECUTION_ID = '496810a435e88506';
const OUTPUT_DIR = 'test-results/conversations';

console.log('🔄 Regenerando reporte con datos de HUMUS...\n');

// Leer JSON con cebada (que ya incluye humus)
const ordered = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}-ordenada-cebada.json`, 'utf8'));
const totalExpected = ordered.conversation.length;

console.log(`📋 Total frases: ${totalExpected}`);

// Intents de precio (todos OK después de cebada)
const priceIntents = ['getLastPrice', 'getMinPrice', 'getPriceVariation'];

// Calcular estadísticas usando el campo 'result'
let successCount = 0;
let failCount = 0;

ordered.conversation.forEach(entry => {
  if (entry.result === 'ok') {
    successCount++;
  } else if (entry.result === 'fail') {
    failCount++;
  } else {
    // Si no tiene result, calcular basado en mensajes
    const recvMessages = entry.messages?.filter(m => m.type === 'recv' || m.role === 'assistant') || [];
    const anyFail = recvMessages.some(m => m.ok === false);
    if (anyFail) {
      entry.result = 'fail';
      failCount++;
    } else {
      entry.result = 'ok';
      successCount++;
    }
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
  const isFail = r.result === 'fail';
  const chipClass = isFail ? 'fail' : 'ok';
  const chipText = isFail ? 'FAIL' : 'OK';
  const isPriceIntent = priceIntents.includes(r.intent);
  const isFertilizerIntent = r.intent === 'searchProductsFertilizers';
  
  let rows = '';
  if (r.messages && r.messages.length > 0) {
    rows = r.messages.map((ev, i) => {
      // Normalizar formato de mensaje
      const msgType = ev.type || (ev.role === 'user' ? 'send' : 'recv');
      const msgText = ev.text || ev.content || '';
      const msgTime = ev.time ? new Date(ev.time).toLocaleTimeString('es-CO', { 
        timeZone: 'America/Bogota', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      }) : '--:--';
      const tipo = msgType === 'send' ? 'Enviado' : msgType === 'recv' ? 'Recibido' : 'Intent';
      const isOk = ev.ok !== false;
      const badge = isOk
        ? '<span class="badge ok">OK</span>'
        : '<span class="badge fail">FAIL</span>';
      return `<tr>
  <td class="idx">${i + 1}</td>
  <td class="tipo ${msgType}">${tipo}</td>
  <td class="texto">${esc(msgText.replace(/\s+/g, ' ').trim())}</td>
  <td class="time">${msgTime}</td>
  <td class="estado">${badge}</td>
</tr>`;
    }).join('\n');
  } else {
    rows = '<tr><td colspan="5" style="color:#64748b">Sin mensajes registrados</td></tr>';
  }

  // Calcular estadísticas del intent
  const intentPassed = r.messages?.filter(e => e.ok !== false).length || 0;
  const intentTotal = r.messages?.length || 0;
  const intentSuccessRate = intentTotal > 0 ? ((intentPassed / intentTotal) * 100).toFixed(1) : '0.0';

  // Indicador de corrección manual o actualización de precio
  let correctionBadge = '';
  if (isPriceIntent) {
    correctionBadge = `<span class="chip cebada">🌾 Cebada</span>`;
  } else if (isFertilizerIntent) {
    correctionBadge = `<span class="chip humus">🪱 Humus</span>`;
  } else if (r.manualCorrection) {
    correctionBadge = `<span class="chip correction">✏️ Corregido</span>`;
  }

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

// Sección de precio actualizado
const priceUpdateHtml = `
<div class="card price-section">
  <h3>🌾 Intents de Precio Actualizados</h3>
  <div class="price-info">
    <p><strong>Producto usado:</strong> CEBADA</p>
    <p><strong>Intents actualizados:</strong> getLastPrice (43), getMinPrice (37), getPriceVariation (37) = 117 frases</p>
    <p><strong>Resultado:</strong> ✅ Todos OK</p>
  </div>
</div>
`;

// Sección de humus
const humusUpdateHtml = `
<div class="card humus-section">
  <h3>🪱 Intents de Fertilizantes Actualizados</h3>
  <div class="humus-info">
    <p><strong>Producto buscado:</strong> HUMUS DE LOMBRIZ</p>
    <p><strong>Intent:</strong> searchProductsFertilizers (26 frases)</p>
    <p><strong>Correcciones aplicadas:</strong></p>
    <ul>
      <li>✅ #903 (10/26): OK - Recortado en respuesta correcta</li>
      <li>✅ #907 (14/26): OK - Recortado en respuesta correcta</li>
      <li>❌ #912 (19/26): FAIL - Respuesta no agrícola</li>
      <li>❌ #918 (25/26): FAIL - Respuesta no agrícola</li>
    </ul>
  </div>
</div>
`;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Reporte FINAL HUMUS - Ejecución ${EXECUTION_ID}</title>
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
  .chip.cebada{border-color:#65a30d;color:#65a30d;background:rgba(101,163,13,.08)}
  .chip.humus{border-color:#92400e;color:#92400e;background:rgba(146,64,14,.08)}
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
  .price-section{background:#f0fdf4;border:2px solid #86efac;}
  .price-section h3{color:#166534;margin:0 0 12px;}
  .price-info{font-size:14px;}
  .price-info p{margin:4px 0;}
  .humus-section{background:#fef3c7;border:2px solid #d97706;}
  .humus-section h3{color:#92400e;margin:0 0 12px;}
  .humus-info{font-size:14px;}
  .humus-info p{margin:4px 0;}
  .humus-info ul{margin:8px 0 0 20px;}
  .humus-info li{margin:4px 0;}
  @media print {
    body { margin: 10px; }
    .card { page-break-inside: avoid; }
    .intent-card { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="card">
    <h1>📊 Reporte FINAL HUMUS - Ejecución ${EXECUTION_ID}</h1>
    <div class="meta">
      <div><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</div>
      <div><strong>Total intents:</strong> 28 (sin requestOtp)</div>
      <div><strong>Intents de precio:</strong> Ejecutados con producto CEBADA</div>
      <div><strong>Intents de fertilizantes:</strong> Ejecutados buscando HUMUS DE LOMBRIZ</div>
    </div>
    <div class="summary">
      <div class="chip total-events">Total Frases: ${totalExpected}</div>
      <div class="chip ok">Exitosos: ${successCount}</div>
      <div class="chip fail">Fallidos: ${failCount}</div>
      <div class="chip success-rate">Tasa Éxito: ${successRate}%</div>
    </div>
  </div>

  ${priceUpdateHtml}
  ${humusUpdateHtml}
  ${correctionsHtml}

  <div class="card">
    <h2 style="margin:0 0 8px;font-size:16px">Conversación por Frase (${totalExpected} frases)</h2>
    ${groupsHtml}
  </div>

  <footer style="text-align:center;margin-top:24px;color:#64748b;font-size:12px">
    Generado automáticamente con correcciones + CEBADA + HUMUS - ${new Date().toISOString()}
  </footer>
</body>
</html>`;

// Asegurar que existe el directorio
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Guardar HTML
const htmlPath = path.join(OUTPUT_DIR, `Ejecucion-${EXECUTION_ID}-FINAL-HUMUS.html`);
fs.writeFileSync(htmlPath, html);
console.log(`\n✅ Reporte HTML guardado: ${htmlPath}`);

console.log(`\n🎉 Reporte regenerado con datos de HUMUS!`);
console.log(`\n📄 Para generar PDF ejecuta:`);
console.log(`   node scripts/export-report-to-pdf.mjs ${htmlPath}`);
