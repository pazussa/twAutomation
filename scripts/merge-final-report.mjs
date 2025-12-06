/**
 * Script para fusionar la conversación original con las frases faltantes ejecutadas
 * y generar el reporte final ordenado correctamente frase por frase
 * 
 * Este script:
 * 1. Lee la conversación original
 * 2. Lee la conversación de frases faltantes
 * 3. Fusiona todo ordenando por índice original
 * 4. Genera un reporte HTML final con las 919 frases (todos menos requestOTP)
 */

import fs from 'fs';
import path from 'path';

const EXECUTION_ID = '496810a435e88506';
const ORIGINAL_CONV_FILE = `conversation-${EXECUTION_ID}.json`;
const MISSING_CONV_FILE = `conversation-${EXECUTION_ID}-missing.json`;
const TEMP_EXEC_FILE = `temp-exec-${EXECUTION_ID}.json`;
const OUTPUT_CONV_FILE = `conversation-${EXECUTION_ID}-final.json`;
const OUTPUT_HTML_FILE = `test-results/conversations/reporte-final-${EXECUTION_ID}.html`;

console.log('🔄 Iniciando fusión de reportes...\n');

// Cargar temp-exec para obtener el orden correcto
const tempExec = JSON.parse(fs.readFileSync(TEMP_EXEC_FILE, 'utf8'));
const totalExpected = tempExec.examples.length;
console.log(`📋 Total de frases esperadas: ${totalExpected}`);

// Crear mapa de ejemplo -> índice para ordenamiento
const exampleToIndex = new Map();
tempExec.examples.forEach((ex, idx) => {
  exampleToIndex.set(ex.example, idx + 1);
});

// Cargar conversación original
let originalEvents = [];
if (fs.existsSync(ORIGINAL_CONV_FILE)) {
  const originalConv = JSON.parse(fs.readFileSync(ORIGINAL_CONV_FILE, 'utf8'));
  originalEvents = originalConv.events || [];
  console.log(`📂 Conversación original: ${originalEvents.filter(e => e.kind === 'intent').length} intents`);
} else {
  console.log(`⚠️ No existe ${ORIGINAL_CONV_FILE}`);
}

// Cargar conversación de faltantes
let missingEvents = [];
if (fs.existsSync(MISSING_CONV_FILE)) {
  const missingConv = JSON.parse(fs.readFileSync(MISSING_CONV_FILE, 'utf8'));
  missingEvents = missingConv.events || [];
  console.log(`📂 Conversación faltantes: ${missingEvents.filter(e => e.kind === 'intent').length} intents`);
} else {
  console.log(`⚠️ No existe ${MISSING_CONV_FILE} - solo se procesará la conversación original`);
}

// Extraer grupos de eventos por intent (intent + sus send/recv asociados)
function extractIntentGroups(events) {
  const groups = [];
  let currentGroup = null;
  
  for (const event of events) {
    if (event.kind === 'intent') {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      // Extraer la frase del texto del intent
      const match = event.text.match(/› (.+)$/);
      const phrase = match ? match[1].trim() : '';
      const idx = exampleToIndex.get(phrase) || 0;
      
      currentGroup = {
        phrase,
        originalIndex: idx,
        events: [event]
      };
    } else if (currentGroup) {
      currentGroup.events.push(event);
    }
  }
  
  if (currentGroup) {
    groups.push(currentGroup);
  }
  
  return groups;
}

// Extraer grupos de ambas conversaciones
const originalGroups = extractIntentGroups(originalEvents);
const missingGroups = extractIntentGroups(missingEvents);

console.log(`\n📊 Grupos extraídos:`);
console.log(`   Original: ${originalGroups.length} intents`);
console.log(`   Faltantes: ${missingGroups.length} intents`);

// Crear mapa de frase -> grupo (priorizar faltantes que son más recientes)
const phraseToGroup = new Map();

// Primero agregar originales
for (const group of originalGroups) {
  if (group.phrase && !phraseToGroup.has(group.phrase)) {
    phraseToGroup.set(group.phrase, group);
  }
}

// Luego sobrescribir/agregar con faltantes
for (const group of missingGroups) {
  if (group.phrase) {
    phraseToGroup.set(group.phrase, group);
  }
}

console.log(`   Frases únicas totales: ${phraseToGroup.size}`);

// Verificar cobertura
const covered = new Set(phraseToGroup.keys());
const missing = [];
tempExec.examples.forEach((ex, idx) => {
  if (!covered.has(ex.example)) {
    missing.push({ idx: idx + 1, intent: ex.intent, example: ex.example });
  }
});

if (missing.length > 0) {
  console.log(`\n⚠️ Aún faltan ${missing.length} frases por ejecutar:`);
  missing.slice(0, 10).forEach(m => {
    console.log(`   [${m.idx}] ${m.intent} › ${m.example.substring(0, 50)}...`);
  });
  if (missing.length > 10) {
    console.log(`   ... y ${missing.length - 10} más`);
  }
}

// Ordenar grupos por índice original del temp-exec
const sortedGroups = [];
tempExec.examples.forEach((ex, idx) => {
  const group = phraseToGroup.get(ex.example);
  if (group) {
    // Actualizar el índice en el evento intent para que sea correcto
    const intentEvent = group.events.find(e => e.kind === 'intent');
    if (intentEvent) {
      intentEvent.text = `[${idx + 1}/${totalExpected}] ${ex.intent} › ${ex.example}`;
      intentEvent.meta = { idx: idx + 1, total: totalExpected };
    }
    sortedGroups.push(group);
  }
});

console.log(`\n✅ Grupos ordenados: ${sortedGroups.length}`);

// Aplanar eventos
const finalEvents = [];
for (const group of sortedGroups) {
  finalEvents.push(...group.events);
}

console.log(`📝 Total eventos en reporte final: ${finalEvents.length}`);

// Crear conversación final
const finalConversation = {
  title: `Ejecución ${EXECUTION_ID} - Reporte Final (${sortedGroups.length}/${totalExpected} intents)`,
  generatedAt: new Date().toISOString(),
  events: finalEvents
};

// Guardar JSON
fs.writeFileSync(OUTPUT_CONV_FILE, JSON.stringify(finalConversation, null, 2));
console.log(`\n💾 Conversación final guardada: ${OUTPUT_CONV_FILE}`);

// Generar HTML
function generateHTML(conversation) {
  const intents = conversation.events.filter(e => e.kind === 'intent');
  const okCount = intents.filter(e => e.ok !== false).length;
  const errCount = intents.length - okCount;
  
  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${conversation.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
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
    }
    .stat {
      background: rgba(255,255,255,0.2);
      padding: 10px 20px;
      border-radius: 8px;
    }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; opacity: 0.9; }
    .intent-group {
      background: white;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .intent-header {
      background: #f8f9fa;
      padding: 12px 16px;
      border-bottom: 1px solid #e9ecef;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .intent-header.ok { border-left: 4px solid #28a745; }
    .intent-header.err { border-left: 4px solid #dc3545; }
    .intent-idx {
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .intent-name {
      color: #495057;
    }
    .intent-phrase {
      color: #6c757d;
      font-weight: normal;
      margin-left: auto;
      font-size: 14px;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .messages {
      padding: 16px;
    }
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
    .search-box {
      margin-bottom: 20px;
    }
    .search-box input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 16px;
    }
    .search-box input:focus {
      outline: none;
      border-color: #667eea;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${conversation.title}</h1>
    <p>Generado: ${conversation.generatedAt}</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${intents.length}</div>
        <div class="stat-label">Total Intents</div>
      </div>
      <div class="stat">
        <div class="stat-value">${okCount}</div>
        <div class="stat-label">Exitosos</div>
      </div>
      <div class="stat">
        <div class="stat-value">${errCount}</div>
        <div class="stat-label">Con Errores</div>
      </div>
      <div class="stat">
        <div class="stat-value">${((okCount/intents.length)*100).toFixed(1)}%</div>
        <div class="stat-label">Tasa de Éxito</div>
      </div>
    </div>
  </div>
  
  <div class="search-box">
    <input type="text" id="search" placeholder="Buscar por intent, frase o contenido..." oninput="filterIntents()">
  </div>
  
  <div id="intents-container">
`;

  // Agrupar eventos por intent
  let currentIntent = null;
  let currentMessages = [];
  
  const groups = [];
  
  for (const event of conversation.events) {
    if (event.kind === 'intent') {
      if (currentIntent) {
        groups.push({ intent: currentIntent, messages: currentMessages });
      }
      currentIntent = event;
      currentMessages = [];
    } else {
      currentMessages.push(event);
    }
  }
  if (currentIntent) {
    groups.push({ intent: currentIntent, messages: currentMessages });
  }
  
  for (const group of groups) {
    const intent = group.intent;
    const match = intent.text.match(/\[(\d+)\/(\d+)\]\s+(\w+)\s+›\s+(.+)/);
    const idx = match ? match[1] : '?';
    const intentName = match ? match[3] : 'unknown';
    const phrase = match ? match[4] : intent.text;
    const isOk = intent.ok !== false;
    
    html += `
    <div class="intent-group" data-search="${intentName.toLowerCase()} ${phrase.toLowerCase()}">
      <div class="intent-header ${isOk ? 'ok' : 'err'}">
        <span class="intent-idx">${idx}</span>
        <span class="intent-name">${intentName}</span>
        <span class="intent-phrase" title="${phrase}">${phrase}</span>
      </div>
      <div class="messages">
`;
    
    for (const msg of group.messages) {
      const cssClass = msg.kind === 'send' ? 'send' : (msg.ok === false ? 'recv err' : 'recv');
      const time = new Date(msg.t).toLocaleTimeString('es-ES');
      html += `
        <div class="message ${cssClass}">
          ${msg.text}
          <div class="time">${time}</div>
        </div>
`;
    }
    
    html += `
      </div>
    </div>
`;
  }
  
  html += `
  </div>
  
  <script>
    function filterIntents() {
      const query = document.getElementById('search').value.toLowerCase();
      document.querySelectorAll('.intent-group').forEach(el => {
        const searchData = el.getAttribute('data-search');
        el.classList.toggle('hidden', !searchData.includes(query));
      });
    }
  </script>
</body>
</html>`;

  return html;
}

// Crear directorio si no existe
const htmlDir = path.dirname(OUTPUT_HTML_FILE);
if (!fs.existsSync(htmlDir)) {
  fs.mkdirSync(htmlDir, { recursive: true });
}

// Generar y guardar HTML
const htmlContent = generateHTML(finalConversation);
fs.writeFileSync(OUTPUT_HTML_FILE, htmlContent);
console.log(`💾 Reporte HTML guardado: ${OUTPUT_HTML_FILE}`);

// Resumen final
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 RESUMEN FINAL`);
console.log(`${'='.repeat(60)}`);
console.log(`   Frases esperadas: ${totalExpected}`);
console.log(`   Frases en reporte: ${sortedGroups.length}`);
console.log(`   Frases faltantes: ${missing.length}`);
console.log(`   Cobertura: ${((sortedGroups.length/totalExpected)*100).toFixed(1)}%`);
console.log(`${'='.repeat(60)}\n`);

if (missing.length === 0) {
  console.log('🎉 ¡REPORTE COMPLETO! Todas las 919 frases están incluidas.');
} else {
  console.log(`⚠️ Faltan ${missing.length} frases. Ejecuta execute-missing.spec.ts para completar.`);
}
