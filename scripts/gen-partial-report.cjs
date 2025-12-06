const fs = require('fs');
const path = require('path');

// Leer el archivo de conversación
const convFile = process.argv[2] || 'conversation-1764123979119.json';
const executionId = process.argv[3] || '496810a435e88506';
const data = JSON.parse(fs.readFileSync(convFile, 'utf8'));
const allEvents = data.events || [];

console.log('Eventos:', allEvents.length);

// Escapar HTML
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Agrupar por intent
const groups = [];
let currentGroup = null;
for (const ev of allEvents) {
  if (ev.kind === 'intent') {
    if (currentGroup) groups.push(currentGroup);
    currentGroup = { label: ev.text, idx: ev.meta?.idx || 0, total: ev.meta?.total || 0, events: [] };
  } else if (currentGroup) {
    currentGroup.events.push(ev);
  }
}
if (currentGroup) groups.push(currentGroup);

// Calcular estadísticas
const intentStats = groups.map(g => {
  const hasError = g.events.some(ev => ev.ok === false);
  const passed = g.events.filter(ev => ev.ok !== false).length;
  const total = g.events.length;
  return {
    ...g,
    status: hasError ? 'fail' : 'ok',
    intentPassed: passed,
    intentTotal: total,
    intentSuccessRate: total > 0 ? ((passed / total) * 100).toFixed(0) : '100'
  };
});

const totalIntents = groups.length;

const groupsHtml = intentStats.map(g => {
  const rows = g.events.length
    ? g.events.map((ev, i) => {
        const colTime = new Date(ev.t).toLocaleTimeString('es-CO', { 
          timeZone: 'America/Bogota', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        });
        const tipo = ev.kind === 'send' ? 'Enviado' : ev.kind === 'recv' ? 'Recibido' : 'Intent';
        const badge = ev.ok !== false ? '<span class="badge ok">OK</span>' : '<span class="badge fail">FAIL</span>';
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
    <span class="chip success-rate">Exito: ${g.intentSuccessRate}% (${g.intentPassed}/${g.intentTotal})</span>
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

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Ejecucion ${executionId} - PARCIAL</title>
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
.partial-notice{background:#dbeafe;border:2px solid #3b82f6;border-radius:12px;padding:12px 16px;margin-bottom:16px;}
.partial-notice h3{margin:0 0 4px;color:#1e40af;font-size:15px;}
.partial-notice p{margin:0;color:#1e3a8a;font-size:13px;}
</style>
</head>
<body>
<div class="partial-notice">
  <h3>Reporte Parcial</h3>
  <p>Esta ejecucion esta en progreso. Los datos mostrados son hasta el momento de la pausa.</p>
</div>
<div class="card">
  <h1>Ejecucion ${executionId} - Parcial</h1>
  <div class="meta">
    <div><strong>Estado:</strong> En progreso (pausado)</div>
    <div><strong>Eventos registrados:</strong> ${allEvents.length}</div>
  </div>
  <div class="summary">
    <div class="chip total-events">Total Intents: ${totalIntents}</div>
    <div class="chip ok">Intents OK: ${intentStats.filter(g => g.status === 'ok').length}</div>
    <div class="chip fail">Intents FAIL: ${intentStats.filter(g => g.status === 'fail').length}</div>
    <div class="chip success-rate">Exito: ${totalIntents > 0 ? ((intentStats.filter(g => g.status === 'ok').length / totalIntents) * 100).toFixed(1) : '0.0'}%</div>
  </div>
</div>

<div class="card">
  <h2 style="margin:0 0 8px;font-size:16px">Conversacion por intent</h2>
  ${groupsHtml}
</div>
</body>
</html>`;

const htmlPath = 'test-results/conversations/Ejecucion-' + executionId + '-Parcial.html';
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML generado:', htmlPath);
