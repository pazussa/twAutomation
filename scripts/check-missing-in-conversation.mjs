/**
 * Verificar cuáles de las 153 frases faltantes están o no en conversation
 */

import fs from 'fs';

const EXECUTION_ID = '496810a435e88506';

// Leer temp-exec original
const tempExec = JSON.parse(fs.readFileSync(`temp-exec-${EXECUTION_ID}-original.json`, 'utf8'));
console.log(`📋 Total frases en temp-exec: ${tempExec.examples.length}`);

// Leer conversación
const conv = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}.json`, 'utf8'));
console.log(`📋 Total eventos en conversación: ${conv.events.length}`);

// Extraer todas las frases ejecutadas de la conversación (con conteo)
const executedPhrases = new Map();
conv.events.filter(e => e.kind === 'intent').forEach(e => {
  const match = e.text.match(/ › (.+)/);
  if (match) {
    const phrase = match[1].trim();
    executedPhrases.set(phrase, (executedPhrases.get(phrase) || 0) + 1);
  }
});

console.log(`📋 Frases únicas ejecutadas en conversación: ${executedPhrases.size}`);

// Contar cuántas veces aparece cada frase en temp-exec
const tempExecCount = new Map();
tempExec.examples.forEach(ex => {
  tempExecCount.set(ex.example, (tempExecCount.get(ex.example) || 0) + 1);
});

// Identificar faltantes: frases que no tienen suficientes ejecuciones
const missing = [];
const usedCount = new Map();

tempExec.examples.forEach((ex, idx) => {
  const used = usedCount.get(ex.example) || 0;
  const available = executedPhrases.get(ex.example) || 0;
  
  if (used >= available) {
    // No hay más ejecuciones disponibles para esta frase
    missing.push({ 
      idx: idx + 1, 
      intent: ex.intent, 
      phrase: ex.example,
      inConversation: executedPhrases.has(ex.example),
      timesInConv: available,
      timesNeeded: tempExecCount.get(ex.example)
    });
  } else {
    usedCount.set(ex.example, used + 1);
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log('ANÁLISIS DE FRASES FALTANTES');
console.log('='.repeat(60));
console.log(`Total faltantes: ${missing.length}`);

// Separar: las que están en conversación pero no suficientes vs las que no están
const inConvButNotEnough = missing.filter(m => m.inConversation);
const notInConv = missing.filter(m => !m.inConversation);

console.log(`\n📌 Frases que SÍ están en conversación pero no hay suficientes ejecuciones: ${inConvButNotEnough.length}`);
console.log(`📌 Frases que NO están en conversación (nunca ejecutadas): ${notInConv.length}`);

// Agrupar por intent
console.log('\n--- Frases NUNCA ejecutadas por intent ---');
const notInConvByIntent = {};
notInConv.forEach(m => {
  if (!notInConvByIntent[m.intent]) notInConvByIntent[m.intent] = [];
  notInConvByIntent[m.intent].push(m);
});

Object.entries(notInConvByIntent).sort((a,b) => b[1].length - a[1].length).forEach(([intent, items]) => {
  console.log(`  ${intent}: ${items.length}`);
});

console.log('\n--- Primeras 30 frases NUNCA ejecutadas ---');
notInConv.slice(0, 30).forEach(m => {
  console.log(`[${m.idx}] ${m.intent}: ${m.phrase.substring(0, 60)}...`);
});

if (inConvButNotEnough.length > 0) {
  console.log('\n--- Frases con ejecuciones insuficientes (duplicadas en temp-exec) ---');
  inConvButNotEnough.slice(0, 20).forEach(m => {
    console.log(`[${m.idx}] ${m.intent}: "${m.phrase.substring(0, 40)}..." (hay ${m.timesInConv}, necesita ${m.timesNeeded})`);
  });
}
