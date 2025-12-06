import fs from 'fs';

const EXECUTION_ID = '496810a435e88506';

// Usar temp-exec original que tiene frases materializadas
console.log('📖 Leyendo temp-exec original...');
const tempExec = JSON.parse(fs.readFileSync(`temp-exec-${EXECUTION_ID}-original.json`, 'utf8'));
const expected = new Map();
tempExec.examples.forEach((ex, idx) => {
  expected.set(ex.example, { idx: idx + 1, intent: ex.intent });
});

console.log(`✅ Total frases en temp-exec: ${expected.size}`);

// Leer conversación
console.log('📖 Leyendo conversación...');
const conv = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}.json`, 'utf8'));
const executed = new Set();
const executedList = [];

conv.events.filter(e => e.kind === 'intent').forEach(e => {
  const match = e.text.match(/ › (.+)/);
  if (match) {
    const phrase = match[1].trim();
    executed.add(phrase);
    executedList.push({ text: e.text, phrase });
  }
});

console.log(`✅ Total intents en conversación: ${executedList.length}`);
console.log(`✅ Frases únicas ejecutadas: ${executed.size}`);

// Faltantes
const missing = [];
expected.forEach((info, phrase) => {
  if (!executed.has(phrase)) {
    missing.push({ idx: info.idx, intent: info.intent, phrase });
  }
});

// Agrupar por intent
const missingByIntent = {};
missing.forEach(m => {
  if (!missingByIntent[m.intent]) missingByIntent[m.intent] = [];
  missingByIntent[m.intent].push(m);
});

console.log(`\n${'='.repeat(70)}`);
console.log('RESUMEN DE COBERTURA');
console.log('='.repeat(70));
console.log(`Frases esperadas: ${expected.size}`);
console.log(`Frases ejecutadas (únicas): ${executed.size}`);
console.log(`Frases faltantes: ${missing.length}`);
console.log(`Cobertura: ${((expected.size - missing.length) / expected.size * 100).toFixed(1)}%`);

if (missing.length > 0) {
  console.log(`\n${'='.repeat(70)}`);
  console.log('FRASES FALTANTES POR INTENT');
  console.log('='.repeat(70));
  
  Object.keys(missingByIntent).sort().forEach(intent => {
    const items = missingByIntent[intent];
    console.log(`\n❌ ${intent}: ${items.length} faltantes`);
    items.slice(0, 3).forEach(m => {
      console.log(`   [${m.idx}] ${m.phrase.substring(0, 55)}...`);
    });
    if (items.length > 3) {
      console.log(`   ... y ${items.length - 3} más`);
    }
  });
}

if (missing.length === 0) {
  console.log('\n🎉 ¡COBERTURA COMPLETA! Todas las frases fueron ejecutadas.');
}
