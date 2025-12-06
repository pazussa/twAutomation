/**
 * Script para regenerar el reporte HTML con los datos actualizados de Cebada
 */

import fs from 'fs';

const jsonPath = 'conversation-496810a435e88506-ordenada-cebada.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('📂 Cargado:', jsonPath);
console.log(`   Entradas: ${data.conversation.length}`);

// Calcular estadísticas
const byIntent = {};
let totalOK = 0;
let totalFAIL = 0;

for (const entry of data.conversation) {
  if (!byIntent[entry.intent]) {
    byIntent[entry.intent] = { ok: 0, fail: 0, total: 0 };
  }
  byIntent[entry.intent].total++;
  
  // Determinar OK/FAIL basado en los mensajes
  const hasAssistant = entry.messages?.some(m => m.role === 'assistant');
  const isOK = entry.executed && hasAssistant;
  
  if (isOK) {
    byIntent[entry.intent].ok++;
    totalOK++;
  } else {
    byIntent[entry.intent].fail++;
    totalFAIL++;
  }
}

const successRate = ((totalOK / data.conversation.length) * 100).toFixed(1);

console.log(`\n📊 Estadísticas:`);
console.log(`   OK: ${totalOK}`);
console.log(`   FAIL: ${totalFAIL}`);
console.log(`   Total: ${data.conversation.length}`);
console.log(`   Tasa éxito: ${successRate}%`);

// Generar HTML
const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ejecución ${data.executionId} - COMPLETO CEBADA</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
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
        .toggle-all { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
        .toggle-all:hover { background: #5a6fd6; }
        .summary-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .summary-table th, .summary-table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
        .summary-table th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌾 Ejecución ${data.executionId} - CEBADA</h1>
            <p>Generado: ${new Date().toLocaleString('es-ES')}</p>
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

        <h2 style="margin: 20px 0;">Resumen por Intent</h2>
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

        <h2 style="margin: 30px 0 20px;">Detalle por Intent</h2>

${Object.entries(byIntent).map(([intent, stats]) => {
  const phrases = data.conversation.filter(e => e.intent === intent);
  return `
        <div class="intent-section">
            <div class="intent-header" onclick="toggleIntent('${intent}')">
                <span class="intent-name">${intent}</span>
                <div class="intent-stats">
                    <span class="intent-stat ok">${stats.ok} OK</span>
                    <span class="intent-stat fail">${stats.fail} FAIL</span>
                </div>
            </div>
            <div class="phrases" id="phrases-${intent}">
${phrases.map(p => {
  const hasAssistant = p.messages?.some(m => m.role === 'assistant');
  const status = p.executed && hasAssistant ? 'ok' : 'fail';
  return `
                <div class="phrase">
                    <div class="phrase-header">
                        <span class="phrase-index">#${p.index}</span>
                        <span class="phrase-status ${status}">${status.toUpperCase()}</span>
                    </div>
                    <div class="phrase-text">${escapeHtml(p.phrase)}</div>
                    <div class="messages">
${(p.messages || []).map(m => `
                        <div class="message ${m.role}">${escapeHtml(m.content)}</div>`).join('')}
                    </div>
                </div>`;
}).join('')}
            </div>
        </div>`;
}).join('')}
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

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const outputPath = `Ejecucion-${data.executionId}-CEBADA.html`;
fs.writeFileSync(outputPath, html);
console.log(`\n💾 HTML guardado en: ${outputPath}`);
