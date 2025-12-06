/**
 * Script para:
 * 1. Aplicar correcciones a la conversación de humus (10, 14 OK recortado; 19, 25 FAIL)
 * 2. Reemplazar searchProductsFertilizers en el JSON de cebada
 * 3. Regenerar el reporte final
 */

import fs from 'fs';

const HUMUS_CONV_PATH = 'conversation-1764268769617.json';
const CEBADA_JSON_PATH = 'conversation-496810a435e88506-ordenada-cebada.json';

console.log('📂 Cargando archivos...');
const humusConv = JSON.parse(fs.readFileSync(HUMUS_CONV_PATH, 'utf8'));
const cebadaData = JSON.parse(fs.readFileSync(CEBADA_JSON_PATH, 'utf8'));

// Parsear conversación de humus
const humusResults = [];
let currentPhrase = null;
let currentMessages = [];
let currentIntent = null;
let currentIdx = 0;

for (const event of humusConv.events) {
  if (event.kind === 'intent') {
    if (currentPhrase && currentMessages.length > 0) {
      humusResults.push({
        idx: currentIdx,
        intent: currentIntent,
        phrase: currentPhrase,
        messages: [...currentMessages]
      });
    }
    const match = event.text.match(/\[(\d+)\/\d+\]\s+(\w+)\s+›\s+(.+)/);
    if (match) {
      currentIdx = parseInt(match[1]);
      currentIntent = match[2];
      currentPhrase = match[3];
      currentMessages = [];
    }
  } else if (event.kind === 'send' || event.kind === 'recv') {
    if (event.text !== 'cancelar') {
      currentMessages.push({
        type: event.kind,
        text: event.text,
        time: event.t,
        ok: event.ok
      });
    }
  }
}
if (currentPhrase && currentMessages.length > 0) {
  humusResults.push({
    idx: currentIdx,
    intent: currentIntent,
    phrase: currentPhrase,
    messages: [...currentMessages]
  });
}

console.log(`📝 Frases parseadas de humus: ${humusResults.length}`);

// Aplicar correcciones a humus
// 10/26 y 14/26: OK, recortar hasta el mensaje de "Fertilizante: humus de lombriz..."
// 19/26 y 25/26: FAIL por "Gracias por escribir..."

const TRUNCATE_TEXT = "Fertilizante: humus de lombriz - Fabricante: lombricultura el edén Fertilizante: humus de lombriz - Fabricante: lombricultura el edén.";
const FAIL_TEXT = "Gracias por escribir. Estoy especializado únicamente en temas agrícolas";

for (const r of humusResults) {
  if (r.idx === 10 || r.idx === 14) {
    // Recortar hasta el mensaje de fertilizante
    const truncateIdx = r.messages.findIndex(m => m.text && m.text.includes(TRUNCATE_TEXT));
    if (truncateIdx !== -1) {
      r.messages = r.messages.slice(0, truncateIdx + 1);
      // Marcar todos como ok
      r.messages.forEach(m => m.ok = true);
      console.log(`   ✅ ${r.idx}/26: Recortado y marcado OK`);
    }
  } else if (r.idx === 19 || r.idx === 25) {
    // Marcar como FAIL
    const failMsgIdx = r.messages.findIndex(m => m.text && m.text.includes(FAIL_TEXT));
    if (failMsgIdx !== -1) {
      r.messages[failMsgIdx].ok = false;
      console.log(`   ❌ ${r.idx}/26: Marcado FAIL`);
    }
  }
}

// Encontrar entradas de searchProductsFertilizers en cebada
const fertEntries = cebadaData.conversation.filter(e => e.intent === 'searchProductsFertilizers');
console.log(`\n📊 Entradas searchProductsFertilizers en cebada: ${fertEntries.length}`);

// Reemplazar por posición
let replaced = 0;
for (let i = 0; i < fertEntries.length && i < humusResults.length; i++) {
  const cebEntry = fertEntries[i];
  const humusEntry = humusResults[i];
  
  cebEntry.phrase = humusEntry.phrase;
  cebEntry.messages = humusEntry.messages;
  cebEntry.executed = true;
  cebEntry.timestamp = new Date().toISOString();
  replaced++;
}

console.log(`✅ Reemplazadas: ${replaced} entradas`);

// Actualizar correcciones en el JSON
if (!cebadaData.humusUpdate) {
  cebadaData.humusUpdate = {};
}
cebadaData.humusUpdate = {
  source: HUMUS_CONV_PATH,
  replacedCount: replaced,
  corrections: {
    okTruncated: [10, 14],
    failMarked: [19, 25]
  },
  timestamp: new Date().toISOString()
};

// Guardar JSON actualizado
fs.writeFileSync(CEBADA_JSON_PATH, JSON.stringify(cebadaData, null, 2));
console.log(`\n💾 JSON actualizado: ${CEBADA_JSON_PATH}`);

// Verificar algunas frases
console.log('\n🔍 Verificación:');
for (const idx of [10, 14, 19, 25]) {
  const entry = fertEntries[idx - 1]; // idx es 1-based
  if (entry) {
    const lastMsg = entry.messages[entry.messages.length - 1];
    const preview = lastMsg?.text?.substring(0, 50) || 'N/A';
    const isOk = entry.messages.every(m => m.ok !== false);
    console.log(`   ${idx}/26: ${isOk ? '✅' : '❌'} "${preview}..."`);
  }
}

console.log('\n🎉 Correcciones aplicadas!');
