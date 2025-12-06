/**
 * Script para reemplazar los resultados de getLastPrice, getMinPrice, getPriceVariation
 * con los nuevos resultados de Cebada
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

// Identificar índices de los intents de precio en ordenada
const priceIntents = ['getLastPrice', 'getMinPrice', 'getPriceVariation'];
const priceIndices = ordenada
  .filter(e => priceIntents.includes(e.intent))
  .map(e => ({ index: e.index, intent: e.intent, phrase: e.phrase }));

console.log(`\n🎯 Intents de precio en ordenada: ${priceIndices.length}`);

// Parsear la conversación de Cebada por frase
const cebadaByPhrase = new Map();
let currentPhrase = null;
let currentMessages = [];
let currentIntent = null;

for (const event of cebadaConv.events) {
  if (event.kind === 'intent') {
    // Guardar anterior si existe
    if (currentPhrase && currentMessages.length > 0) {
      cebadaByPhrase.set(currentPhrase, {
        intent: currentIntent,
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
  cebadaByPhrase.set(currentPhrase, {
    intent: currentIntent,
    messages: [...currentMessages]
  });
}

console.log(`📝 Frases parseadas de Cebada: ${cebadaByPhrase.size}`);

// Ahora necesitamos mapear las frases de precio en ordenada con las de cebada
// Las frases en ordenada tienen variables materializadas diferente (Trigo, etc)
// Las de cebada tienen Cebada

// Cargar temp-exec de cebada para obtener el orden exacto
const tempExecCebada = JSON.parse(fs.readFileSync('temp-exec-price-cebada-19ac6525431.json', 'utf8'));
const cebadaPhrases = tempExecCebada.examples.map(e => e.example);

console.log(`📋 Frases en temp-exec Cebada: ${cebadaPhrases.length}`);

// Cargar temp-exec original para mapear por posición dentro de cada intent
const tempExecOriginal = JSON.parse(fs.readFileSync('temp-exec-48e45a6d715b420b.json', 'utf8'));

// Agrupar por intent en original
const originalByIntent = {};
for (const ex of tempExecOriginal.examples) {
  if (!originalByIntent[ex.intent]) originalByIntent[ex.intent] = [];
  originalByIntent[ex.intent].push(ex.example);
}

// Agrupar por intent en cebada
const cebadaByIntent = {};
for (const ex of tempExecCebada.examples) {
  if (!cebadaByIntent[ex.intent]) cebadaByIntent[ex.intent] = [];
  cebadaByIntent[ex.intent].push(ex.example);
}

console.log('\n📊 Comparación por intent:');
for (const intent of priceIntents) {
  const origCount = originalByIntent[intent]?.length || 0;
  const cebCount = cebadaByIntent[intent]?.length || 0;
  console.log(`   ${intent}: original=${origCount}, cebada=${cebCount}`);
}

// Crear mapeo: frase original -> frase cebada (por posición dentro del intent)
const phraseMapping = new Map();
for (const intent of priceIntents) {
  const origPhrases = originalByIntent[intent] || [];
  const cebPhrases = cebadaByIntent[intent] || [];
  
  for (let i = 0; i < origPhrases.length && i < cebPhrases.length; i++) {
    phraseMapping.set(origPhrases[i], cebPhrases[i]);
  }
}

console.log(`\n🔗 Mapeo de frases creado: ${phraseMapping.size} entradas`);

// Reemplazar en ordenada
let replaced = 0;
let notFound = 0;

for (const entry of ordenada) {
  if (!priceIntents.includes(entry.intent)) continue;
  
  const cebadaPhrase = phraseMapping.get(entry.phrase);
  if (!cebadaPhrase) {
    console.log(`   ⚠️ No hay mapeo para: ${entry.phrase.substring(0, 50)}...`);
    notFound++;
    continue;
  }
  
  const cebadaData = cebadaByPhrase.get(cebadaPhrase);
  if (!cebadaData) {
    console.log(`   ⚠️ No hay datos de Cebada para: ${cebadaPhrase.substring(0, 50)}...`);
    notFound++;
    continue;
  }
  
  // Reemplazar
  entry.phrase = cebadaPhrase;  // Actualizar la frase también
  entry.messages = cebadaData.messages;
  entry.executed = true;
  entry.timestamp = new Date().toISOString();
  replaced++;
}

console.log(`\n✅ Reemplazados: ${replaced}`);
console.log(`⚠️ No encontrados: ${notFound}`);

// Guardar
ordenadaData.conversation = ordenada;
ordenadaData.generatedAt = new Date().toISOString();
const outputPath = 'conversation-496810a435e88506-ordenada-cebada.json';
fs.writeFileSync(outputPath, JSON.stringify(ordenadaData, null, 2));
console.log(`\n💾 Guardado en: ${outputPath}`);

// Estadísticas finales
const stats = {};
for (const entry of ordenada) {
  if (!stats[entry.intent]) stats[entry.intent] = { total: 0, executed: 0 };
  stats[entry.intent].total++;
  if (entry.executed) stats[entry.intent].executed++;
}

console.log('\n📊 Estadísticas por intent:');
for (const intent of priceIntents) {
  const s = stats[intent];
  console.log(`   ${intent}: ${s.executed}/${s.total}`);
}
