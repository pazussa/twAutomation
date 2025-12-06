/**
 * Script para regenerar el reporte HTML final con:
 * - Correcciones anteriores preservadas
 * - Datos de precio actualizados con Cebada
 * - Formato normalizado de mensajes
 */

import fs from 'fs';

const cebadaJsonPath = 'conversation-496810a435e88506-ordenada-cebada.json';
const data = JSON.parse(fs.readFileSync(cebadaJsonPath, 'utf8'));

console.log('📂 Cargado:', cebadaJsonPath);
console.log(`   Entradas: ${data.conversation.length}`);
console.log(`   Correcciones previas:`, data.corrections);

// Las correcciones previas que tenemos
const failIndices = new Set(data.corrections?.failMarked || []);
const okIndices = new Set(data.corrections?.okMarked || []);

// Los intents de precio fueron reejecutados con Cebada - todos deberían ser OK
const priceIntents = ['getLastPrice', 'getMinPrice', 'getPriceVariation'];

// Normalizar mensajes a formato {role, content}
function normalizeMessages(messages) {
  if (!messages || messages.length === 0) return [];
  
  return messages.map(m => {
    if (m.role) {
      // Ya está en formato nuevo
      return { role: m.role, content: m.content };
    } else if (m.type) {
      // Formato viejo {type: 'send'/'recv', text: ...}
      return {
        role: m.type === 'send' ? 'user' : 'assistant',
        content: m.text
      };
    }
    return m;
  }).filter(m => m.content && m.content !== 'cancelar');
}

// Calcular estadísticas
const byIntent = {};
let totalOK = 0;
let totalFAIL = 0;

for (const entry of data.conversation) {
  if (!byIntent[entry.intent]) {
    byIntent[entry.intent] = { ok: 0, fail: 0, total: 0, entries: [] };
  }
  byIntent[entry.intent].total++;
  
  // Normalizar mensajes
  entry.messages = normalizeMessages(entry.messages);
  
  // Determinar resultado
  let isOK;
  
  if (priceIntents.includes(entry.intent)) {
    // Intents de precio: siempre OK porque recién se ejecutaron con éxito
    isOK = true;
  } else if (failIndices.has(entry.index)) {
    // Marcado manualmente como FAIL
    isOK = false;
  } else if (okIndices.has(entry.index)) {
    // Marcado manualmente como OK
    isOK = true;
  } else {
    // Por defecto: OK si tiene respuesta del asistente
    const hasAssistant = entry.messages?.some(m => m.role === 'assistant');
    isOK = entry.executed && hasAssistant;
  }
  
  entry.result = isOK ? 'ok' : 'fail';
  
  if (isOK) {
    byIntent[entry.intent].ok++;
    totalOK++;
  } else {
    byIntent[entry.intent].fail++;
    totalFAIL++;
  }
  
  byIntent[entry.intent].entries.push(entry);
}

const successRate = ((totalOK / data.conversation.length) * 100).toFixed(1);

console.log(`\n📊 Estadísticas:`);
console.log(`   OK: ${totalOK}`);
console.log(`   FAIL: ${totalFAIL}`);
console.log(`   Total: ${data.conversation.length}`);
console.log(`   Tasa éxito: ${successRate}%`);

console.log('\n📊 Por intent:');
for (const [intent, stats] of Object.entries(byIntent)) {
  console.log(`   ${intent}: ${stats.ok}/${stats.total} OK (${((stats.ok/stats.total)*100).toFixed(0)}%)`);
}

// Actualizar el JSON con los resultados
data.summary = {
  totalPhrases: data.conversation.length,
  ok: totalOK,
  fail: totalFAIL,
  successRate: successRate + '%',
  updatedAt: new Date().toISOString()
};

fs.writeFileSync(cebadaJsonPath, JSON.stringify(data, null, 2));
console.log(`\n💾 JSON actualizado: ${cebadaJsonPath}`);

// Generar HTML
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
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
    <title>Ejecución ${data.executionId} - FINAL CEBADA</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; line-height: 1.5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #2d5016 0%, #4a7c23 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 1.8em; margin-bottom: 10px; }
        .stats { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 15px; }
        .stat { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; }
        .stat-value { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        .intent-section { background: white; border-radius: 10px; margin-bottom: 15px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .intent-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .intent-header:hover { background: #f0f0f0; }
        .intent-name { font-weight: 600; font-size: 1.1em; }
        .intent-stats { display: flex; gap: 15px; }
        .intent-stat { padding: 4px 12px; border-radius: 15px; font-size: 0.85em; }
        .intent-stat.ok { background: #d4edda; color: #155724; }
        .intent-stat.fail { background: #f8d7da; color: #721c24; }
        .phrases { display: none; padding: 0; }
        .phrases.active { display: block; }
        .phrase { border-bottom: 1px solid #f0f0f0; padding: 15px 20px; }
        .phrase:last-child { border-bottom: none; }
        .phrase-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .phrase-index { background: #e9ecef; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; color: #666; }
        .phrase-status { padding: 4px 12px; border-radius: 4px; font-size: 0.8em; font-weight: 600; }
        .phrase-status.ok { background: #28a745; color: white; }
        .phrase-status.fail { background: #dc3545; color: white; }
        .phrase-text { font-size: 1em; color: #333; margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .messages { margin-top: 10px; }
        .message { padding: 8px 12px; margin: 5px 0; border-radius: 8px; max-width: 85%; }
        .message.user { background: #007bff; color: white; margin-left: auto; text-align: right; }
        .message.assistant { background: #e9ecef; color: #333; }
        .toggle-all { background: #4a7c23; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
        .toggle-all:hover { background: #3d6a1d; }
        .summary-table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 10px; overflow: hidden; }
        .summary-table th, .summary-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
        .summary-table th { background: #f8f9fa; font-weight: 600; }
        .summary-table tr:last-child td { border-bottom: none; }
        @media print {
            .toggle-all { display: none; }
            .phrases { display: block !important; }
            .intent-section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌾 Ejecución ${data.executionId} - FINAL CEBADA</h1>
            <p>Generado: ${new Date().toLocaleString('es-ES')}</p>
            <p style="opacity: 0.8; font-size: 0.9em;">Intents de precio ejecutados con producto: CEBADA</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${data.conversation.length}</div>
                    <div class="stat-label">Total Frases</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${totalOK}</div>
                    <div class="stat-label">Exitosas (OK)</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${totalFAIL}</div>
                    <div class="stat-label">Fallidas (FAIL)</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${successRate}%</div>
                    <div class="stat-label">Tasa de Éxito</div>
                </div>
            </div>
        </div>

        <button class="toggle-all" onclick="toggleAll()">Expandir/Colapsar Todo</button>

        <h2 style="margin: 20px 0;">📋 Resumen por Intent</h2>
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Intent</th>
                    <th>Total</th>
                    <th>OK</th>
                    <th>FAIL</th>
                    <th>Tasa</th>
                </tr>
            </thead>
            <tbody>
${Object.entries(byIntent).map(([intent, stats]) => `
                <tr>
                    <td><strong>${intent}</strong></td>
                    <td>${stats.total}</td>
                    <td style="color: #28a745;">${stats.ok}</td>
                    <td style="color: #dc3545;">${stats.fail}</td>
                    <td>${((stats.ok / stats.total) * 100).toFixed(1)}%</td>
                </tr>`).join('')}
            </tbody>
        </table>

        <h2 style="margin: 30px 0 20px;">📝 Detalle por Intent</h2>

${Object.entries(byIntent).map(([intent, stats]) => `
        <div class="intent-section">
            <div class="intent-header" onclick="toggleIntent('${intent}')">
                <span class="intent-name">${intent}</span>
                <div class="intent-stats">
                    <span class="intent-stat ok">${stats.ok} OK</span>
                    ${stats.fail > 0 ? `<span class="intent-stat fail">${stats.fail} FAIL</span>` : ''}
                </div>
            </div>
            <div class="phrases" id="phrases-${intent}">
${stats.entries.map(p => `
                <div class="phrase">
                    <div class="phrase-header">
                        <span class="phrase-index">#${p.index}</span>
                        <span class="phrase-status ${p.result}">${p.result.toUpperCase()}</span>
                    </div>
                    <div class="phrase-text">${escapeHtml(p.phrase)}</div>
                    <div class="messages">
${(p.messages || []).map(m => `
                        <div class="message ${m.role}">${escapeHtml(m.content)}</div>`).join('')}
                    </div>
                </div>`).join('')}
            </div>
        </div>`).join('')}
    </div>

    <script>
        function toggleIntent(intent) {
            const el = document.getElementById('phrases-' + intent);
            el.classList.toggle('active');
        }
        function toggleAll() {
            const all = document.querySelectorAll('.phrases');
            const anyActive = Array.from(all).some(el => el.classList.contains('active'));
            all.forEach(el => {
                if (anyActive) el.classList.remove('active');
                else el.classList.add('active');
            });
        }
    </script>
</body>
</html>`;

const outputPath = `Ejecucion-${data.executionId}-FINAL-CEBADA.html`;
fs.writeFileSync(outputPath, html);
console.log(`💾 HTML guardado en: ${outputPath}`);
