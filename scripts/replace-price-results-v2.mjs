/**
 * Script para reemplazar los resultados de getLastPrice, getMinPrice, getPriceVariation
 * con los nuevos resultados de Cebada - versión simplificada
 */

import fs from 'fs';

// Cargar JSON ordenado original
const ordenadaPath = 'conversation-496810a435e88506-ordenada.json';
const cebadaPath = 'conversation-1764263897328.json';

const ordenadaData = JSON.parse(fs.readFileSync(ordenadaPath, 'utf8'));
const ordenada = ordenadaData.conversation;
const cebadaConv = JSON.parse(fs.readFileSync(cebadaPath, 'utf8'));

console.log('📂 Cargados:');
console.log(`   - Ordenada: ${ordenada.length} entradas`);
console.log(`   - Cebada: ${cebadaConv.events.length} eventos`);

// Parsear la conversación de Cebada - extraer frases en orden
const cebadaResults = [];
let currentPhrase = null;
let currentMessages = [];
let currentIntent = null;

for (const event of cebadaConv.events) {
  if (event.kind === 'intent') {
    // Guardar anterior si existe
    if (currentPhrase && currentMessages.length > 0) {
      cebadaResults.push({
        intent: currentIntent,
        phrase: currentPhrase,
        messages: [...currentMessages]
      });
    }
    // Extraer intent y frase
    const match = event.text.match(/\[\d+\/\d+\]\s+(\w+)\s+›\s+(.+)/);
    if (match) {
      currentIntent = match[1];
      currentPhrase = match[2];
      currentMessages = [];
    }
  } else if (event.kind === 'send' || event.kind === 'recv') {
    if (event.text !== 'cancelar') {
      currentMessages.push({
        role: event.kind === 'send' ? 'user' : 'assistant',
        content: event.text
      });
    }
  }
}
// Guardar el último
if (currentPhrase && currentMessages.length > 0) {
  cebadaResults.push({
    intent: currentIntent,
    phrase: currentPhrase,
    messages: [...currentMessages]
  });
}

console.log(`📝 Frases parseadas de Cebada: ${cebadaResults.length}`);

// Agrupar resultados de cebada por intent
const cebadaByIntent = {};
for (const r of cebadaResults) {
  if (!cebadaByIntent[r.intent]) cebadaByIntent[r.intent] = [];
  cebadaByIntent[r.intent].push(r);
}

console.log('\n📊 Resultados Cebada por intent:');
for (const [intent, results] of Object.entries(cebadaByIntent)) {
  console.log(`   ${intent}: ${results.length}`);
}

// Identificar entradas de precio en ordenada, por intent
const priceIntents = ['getLastPrice', 'getMinPrice', 'getPriceVariation'];
const ordenadaByIntent = {};
for (const entry of ordenada) {
  if (priceIntents.includes(entry.intent)) {
    if (!ordenadaByIntent[entry.intent]) ordenadaByIntent[entry.intent] = [];
    ordenadaByIntent[entry.intent].push(entry);
  }
}

console.log('\n📊 Entradas de precio en ordenada por intent:');
for (const [intent, entries] of Object.entries(ordenadaByIntent)) {
  console.log(`   ${intent}: ${entries.length}`);
}

// Reemplazar por posición dentro de cada intent
let replaced = 0;
let errors = 0;

for (const intent of priceIntents) {
  const ordEntries = ordenadaByIntent[intent] || [];
  const cebEntries = cebadaByIntent[intent] || [];
  
  console.log(`\n🔄 Procesando ${intent}: ${ordEntries.length} entradas ordenada, ${cebEntries.length} cebada`);
  
  for (let i = 0; i < ordEntries.length; i++) {
    if (i < cebEntries.length) {
      const ordEntry = ordEntries[i];
      const cebEntry = cebEntries[i];
      
      // Actualizar
      ordEntry.phrase = cebEntry.phrase;
      ordEntry.messages = cebEntry.messages;
      ordEntry.executed = true;
      ordEntry.timestamp = new Date().toISOString();
      replaced++;
    } else {
      console.log(`   ⚠️ Falta resultado Cebada para posición ${i + 1}`);
      errors++;
    }
  }
}

console.log(`\n✅ Reemplazados: ${replaced}`);
console.log(`⚠️ Errores: ${errors}`);

// Guardar
ordenadaData.conversation = ordenada;
ordenadaData.generatedAt = new Date().toISOString();
ordenadaData.priceUpdate = {
  source: cebadaPath,
  replacedCount: replaced,
  timestamp: new Date().toISOString()
};

const outputPath = 'conversation-496810a435e88506-ordenada-cebada.json';
fs.writeFileSync(outputPath, JSON.stringify(ordenadaData, null, 2));
console.log(`\n💾 Guardado en: ${outputPath}`);

// Verificar algunas frases
console.log('\n🔍 Verificación (primeras 3 de cada intent):');
for (const intent of priceIntents) {
  const entries = ordenada.filter(e => e.intent === intent).slice(0, 3);
  console.log(`\n${intent}:`);
  for (const e of entries) {
    const preview = e.phrase.substring(0, 60);
    const hasCebada = e.phrase.toLowerCase().includes('cebada');
    console.log(`   ${e.index}: ${preview}... ${hasCebada ? '✅' : '❌'}`);
  }
}
