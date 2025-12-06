/**
 * Script para generar el reporte FINAL que corresponde exactamente
 * frase por frase con el temp-exec original (919 frases)
 * 
 * Este script:
 * 1. Lee el temp-exec original con las 919 frases ordenadas
 * 2. Lee la conversación ejecutada
 * 3. Para cada frase del temp-exec, busca su ejecución correspondiente
 * 4. Genera un reporte HTML ordenado 1:1
 */

import fs from 'fs';
import path from 'path';

const EXECUTION_ID = '496810a435e88506';
const OUTPUT_DIR = 'test-results/conversations';

console.log('🔄 Generando reporte final ordenado...\n');

// Leer temp-exec original (919 frases en orden)
const tempExec = JSON.parse(fs.readFileSync(`temp-exec-${EXECUTION_ID}-original.json`, 'utf8'));
const totalExpected = tempExec.examples.length;
console.log(`📋 Total frases en temp-exec: ${totalExpected}`);

// Leer conversación
const conv = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}.json`, 'utf8'));
const intents = conv.events.filter(e => e.kind === 'intent');
console.log(`📋 Total intents ejecutados: ${intents.length}`);

// Crear mapa de frase -> eventos de ejecución
// Una frase puede haberse ejecutado múltiples veces
const phraseExecutions = new Map();

let currentIntentEvents = null;
conv.events.forEach(event => {
  if (event.kind === 'intent') {
    // Guardar el grupo anterior
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
    // Iniciar nuevo grupo
    currentIntentEvents = {
      intent: event,
      messages: []
    };
  } else if (currentIntentEvents) {
    currentIntentEvents.messages.push(event);
  }
});
// Guardar el último grupo
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

console.log(`📋 Frases únicas ejecutadas: ${phraseExecutions.size}`);

// Construir reporte ordenado según temp-exec
const orderedResults = [];
const usedExecutions = new Map(); // Rastrear qué ejecuciones ya usamos

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

console.log(`\n${'='.repeat(60)}`);
console.log('ESTADÍSTICAS FINALES');
console.log('='.repeat(60));
console.log(`Total frases esperadas: ${totalExpected}`);
console.log(`Frases ejecutadas: ${executed}`);
console.log(`Frases faltantes: ${missing.length}`);
console.log(`Cobertura: ${(executed / totalExpected * 100).toFixed(1)}%`);

if (missing.length > 0) {
  console.log(`\n⚠️  FRASES FALTANTES:`);
  const byIntent = {};
  missing.forEach(m => {
    if (!byIntent[m.intent]) byIntent[m.intent] = [];
    byIntent[m.intent].push(m);
  });
  Object.keys(byIntent).sort().forEach(intent => {
    console.log(`   ${intent}: ${byIntent[intent].length}`);
  });
}

// Generar HTML
console.log(`\n📝 Generando reporte HTML...`);

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Final - ${EXECUTION_ID}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.4;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .stats {
      display: flex;
      gap: 20px;
      margin-top: 15px;
      flex-wrap: wrap;
    }
    .stat {
      background: rgba(255,255,255,0.2);
      padding: 10px 20px;
      border-radius: 8px;
    }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; opacity: 0.9; }
    .filters {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .filters input {
      flex: 1;
      min-width: 200px;
      padding: 10px 15px;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      font-size: 14px;
    }
    .filters input:focus { outline: none; border-color: #667eea; }
    .filters button {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-all { background: #667eea; color: white; }
    .btn-ok { background: #28a745; color: white; }
    .btn-missing { background: #dc3545; color: white; }
    .intent-group {
      background: white;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .intent-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .intent-header:hover { background: #f8f9fa; }
    .intent-header.executed { border-left: 4px solid #28a745; }
    .intent-header.missing { border-left: 4px solid #dc3545; background: #fff5f5; }
    .intent-idx {
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      min-width: 50px;
      text-align: center;
    }
    .intent-name {
      color: #495057;
      font-weight: 600;
      min-width: 180px;
    }
    .intent-phrase {
      color: #6c757d;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .intent-status {
      font-size: 18px;
    }
    .messages {
      padding: 16px;
      display: none;
      background: #fafafa;
    }
    .messages.show { display: block; }
    .message {
      padding: 10px 14px;
      margin-bottom: 8px;
      border-radius: 12px;
      max-width: 80%;
    }
    .message.send {
      background: #667eea;
      color: white;
      margin-left: auto;
    }
    .message.recv {
      background: #e9ecef;
      color: #212529;
    }
    .message.recv.err {
      background: #f8d7da;
      color: #721c24;
    }
    .time {
      font-size: 10px;
      opacity: 0.7;
      margin-top: 4px;
    }
    .hidden { display: none !important; }
    .no-execution {
      padding: 20px;
      text-align: center;
      color: #dc3545;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Reporte Final - Ejecución ${EXECUTION_ID}</h1>
    <p>Generado: ${new Date().toLocaleString('es-ES')}</p>
    <p>Total intents: 28 (sin requestOtp)</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${totalExpected}</div>
        <div class="stat-label">Total Frases</div>
      </div>
      <div class="stat">
        <div class="stat-value">${executed}</div>
        <div class="stat-label">Ejecutadas</div>
      </div>
      <div class="stat">
        <div class="stat-value">${missing.length}</div>
        <div class="stat-label">Faltantes</div>
      </div>
      <div class="stat">
        <div class="stat-value">${(executed / totalExpected * 100).toFixed(1)}%</div>
        <div class="stat-label">Cobertura</div>
      </div>
    </div>
  </div>
  
  <div class="filters">
    <input type="text" id="search" placeholder="Buscar por intent o frase..." oninput="filterResults()">
    <button class="btn-all" onclick="showAll()">Todas</button>
    <button class="btn-ok" onclick="showExecuted()">✅ Ejecutadas</button>
    <button class="btn-missing" onclick="showMissing()">❌ Faltantes</button>
  </div>
  
  <div id="results">
${orderedResults.map(r => {
  const statusClass = r.executed ? 'executed' : 'missing';
  const statusIcon = r.executed ? '✅' : '❌';
  const messagesHtml = r.execution ? r.execution.messages.map(msg => {
    const cssClass = msg.kind === 'send' ? 'send' : (msg.ok === false ? 'recv err' : 'recv');
    const time = new Date(msg.t).toLocaleTimeString('es-ES');
    return `<div class="message ${cssClass}">${escapeHtml(msg.text)}<div class="time">${time}</div></div>`;
  }).join('\n') : '<div class="no-execution">Esta frase no fue ejecutada</div>';
  
  return `
    <div class="intent-group" data-status="${r.executed ? 'executed' : 'missing'}" data-search="${r.intent.toLowerCase()} ${r.phrase.toLowerCase()}">
      <div class="intent-header ${statusClass}" onclick="toggleMessages(this)">
        <span class="intent-idx">${r.idx}</span>
        <span class="intent-name">${r.intent}</span>
        <span class="intent-phrase" title="${escapeHtml(r.phrase)}">${escapeHtml(r.phrase)}</span>
        <span class="intent-status">${statusIcon}</span>
      </div>
      <div class="messages">
        ${messagesHtml}
      </div>
    </div>`;
}).join('\n')}
  </div>
  
  <script>
    function toggleMessages(header) {
      const messages = header.nextElementSibling;
      messages.classList.toggle('show');
    }
    
    function filterResults() {
      const query = document.getElementById('search').value.toLowerCase();
      document.querySelectorAll('.intent-group').forEach(el => {
        const searchData = el.getAttribute('data-search');
        el.classList.toggle('hidden', !searchData.includes(query));
      });
    }
    
    function showAll() {
      document.querySelectorAll('.intent-group').forEach(el => el.classList.remove('hidden'));
      document.getElementById('search').value = '';
    }
    
    function showExecuted() {
      document.querySelectorAll('.intent-group').forEach(el => {
        el.classList.toggle('hidden', el.getAttribute('data-status') !== 'executed');
      });
    }
    
    function showMissing() {
      document.querySelectorAll('.intent-group').forEach(el => {
        el.classList.toggle('hidden', el.getAttribute('data-status') !== 'missing');
      });
    }
  </script>
</body>
</html>`;

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Guardar HTML
const htmlPath = path.join(OUTPUT_DIR, `reporte-final-ordenado-${EXECUTION_ID}.html`);
fs.writeFileSync(htmlPath, html);
console.log(`✅ Reporte HTML guardado: ${htmlPath}`);

// Guardar JSON con resultados
const jsonPath = path.join(OUTPUT_DIR, `reporte-final-ordenado-${EXECUTION_ID}.json`);
fs.writeFileSync(jsonPath, JSON.stringify({
  executionId: EXECUTION_ID,
  generatedAt: new Date().toISOString(),
  stats: {
    totalExpected,
    executed,
    missing: missing.length,
    coverage: (executed / totalExpected * 100).toFixed(1) + '%'
  },
  results: orderedResults.map(r => ({
    idx: r.idx,
    intent: r.intent,
    phrase: r.phrase,
    executed: r.executed
  })),
  missingByIntent: (() => {
    const byIntent = {};
    missing.forEach(m => {
      if (!byIntent[m.intent]) byIntent[m.intent] = [];
      byIntent[m.intent].push({ idx: m.idx, phrase: m.phrase });
    });
    return byIntent;
  })()
}, null, 2));
console.log(`✅ Reporte JSON guardado: ${jsonPath}`);

console.log(`\n🎉 Reporte generado exitosamente!`);
console.log(`   Abre: ${htmlPath}`);
