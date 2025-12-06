import fs from 'fs';

// Leer temp-exec
const tempExec = JSON.parse(fs.readFileSync('temp-exec-496810a435e88506.json', 'utf8'));

// Leer conversación y extraer frases ejecutadas
const conv = JSON.parse(fs.readFileSync('conversation-496810a435e88506.json', 'utf8'));
const executed = new Set();
conv.events.filter(e => e.kind === 'intent').forEach(e => {
  // Extraer la frase después de '›'
  const match = e.text.match(/› (.+)$/);
  if (match) {
    executed.add(match[1].trim());
  }
});

const total = tempExec.examples.length;
const missingList = [];
tempExec.examples.forEach((ex, idx) => {
  if (!executed.has(ex.example)) {
    missingList.push({idx: idx + 1, intent: ex.intent, example: ex.example});
  }
});
const present = total - missingList.length;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         RESUMEN FINAL DE EJECUCIÓN - ID: 496810a435e88506      ║');
console.log('╠════════════════════════════════════════════════════════════════╣');
console.log('║                                                                ║');
console.log('║  📋 FRASES EN TEMP-EXEC (a ejecutar):          ' + String(total).padStart(3) + '             ║');
console.log('║  ✅ FRASES EJECUTADAS (únicas en conversación): ' + String(present).padStart(3) + '             ║');
console.log('║  ❌ FRASES QUE FALTAN:                          ' + String(missingList.length).padStart(3) + '             ║');
console.log('║                                                                ║');
console.log('║  📊 PORCENTAJE COMPLETADO: ' + ((present/total)*100).toFixed(1) + '%                       ║');
console.log('║                                                                ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

// Agrupar por intent
console.log('\n📋 DESGLOSE DE FRASES FALTANTES POR INTENT:\n');
const byIntent = {};
missingList.forEach(m => {
  if (!byIntent[m.intent]) byIntent[m.intent] = [];
  byIntent[m.intent].push(m);
});

Object.keys(byIntent).sort().forEach(intent => {
  const items = byIntent[intent];
  console.log('  ' + intent + ': ' + items.length + ' frases');
  console.log('    Índices: ' + items.map(i => i.idx).join(', '));
});

console.log('\n📝 LISTADO COMPLETO DE FRASES FALTANTES:\n');
missingList.forEach(m => {
  console.log('[' + m.idx + '] ' + m.intent + ' › ' + m.example);
});
