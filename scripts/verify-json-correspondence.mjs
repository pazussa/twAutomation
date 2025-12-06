/**
 * Verifica la correspondencia 1:1 entre temp-exec y el JSON ordenado
 */

import fs from 'fs';

const EXECUTION_ID = '496810a435e88506';

// Leer temp-exec original (la fuente de verdad)
const tempExec = JSON.parse(fs.readFileSync(`temp-exec-${EXECUTION_ID}-original.json`, 'utf8'));

// Leer JSON ordenado generado
const ordered = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}-ordenada.json`, 'utf8'));

console.log('='.repeat(60));
console.log('VERIFICACIÓN DE CORRESPONDENCIA 1:1');
console.log('='.repeat(60));

console.log('\n📋 temp-exec-original:');
console.log(`   Total frases: ${tempExec.examples.length}`);
console.log(`   Intents: ${[...new Set(tempExec.examples.map(e => e.intent))].length}`);

console.log('\n📋 conversation-ordenada:');
console.log(`   Total frases: ${ordered.conversation.length}`);
console.log(`   Intents: ${ordered.intents.length}`);

// Verificar que no hay requestOtp
const hasRequestOtp = tempExec.examples.some(e => e.intent === 'requestOtp');
console.log(`\n🔍 ¿Incluye requestOtp?: ${hasRequestOtp ? '❌ SÍ (error)' : '✅ NO'}`);

// Verificar correspondencia 1:1
let mismatches = [];
let allMatch = true;

for (let i = 0; i < tempExec.examples.length; i++) {
  const expected = tempExec.examples[i];
  const actual = ordered.conversation[i];
  
  if (!actual) {
    mismatches.push({ idx: i+1, error: 'Falta en ordenada' });
    allMatch = false;
    continue;
  }
  
  if (actual.index !== i + 1) {
    mismatches.push({ idx: i+1, error: `Índice incorrecto: ${actual.index}` });
    allMatch = false;
  }
  
  if (actual.intent !== expected.intent) {
    mismatches.push({ idx: i+1, error: `Intent: esperado=${expected.intent}, actual=${actual.intent}` });
    allMatch = false;
  }
  
  if (actual.phrase !== expected.example) {
    mismatches.push({ idx: i+1, error: 'Frase no coincide' });
    allMatch = false;
  }
}

// Verificar si hay extras
if (ordered.conversation.length > tempExec.examples.length) {
  mismatches.push({ idx: 'extra', error: `Hay ${ordered.conversation.length - tempExec.examples.length} frases de más` });
  allMatch = false;
}

console.log('\n' + '='.repeat(60));
if (allMatch) {
  console.log('✅ CORRESPONDENCIA PERFECTA 1:1');
  console.log('='.repeat(60));
  console.log('   Cada frase del temp-exec corresponde exactamente');
  console.log('   con su entrada en el JSON ordenado.');
} else {
  console.log('❌ HAY DIFERENCIAS');
  console.log('='.repeat(60));
  mismatches.slice(0, 10).forEach(m => {
    console.log(`   [${m.idx}] ${m.error}`);
  });
  if (mismatches.length > 10) {
    console.log(`   ... y ${mismatches.length - 10} más`);
  }
}

// Mostrar resumen de intents
console.log('\n📊 Intents en el JSON (28 sin requestOtp):');
const intentCounts = {};
ordered.conversation.forEach(c => {
  intentCounts[c.intent] = (intentCounts[c.intent] || 0) + 1;
});
Object.entries(intentCounts).sort((a,b) => b[1] - a[1]).forEach(([intent, count]) => {
  console.log(`   ${intent}: ${count}`);
});

// Verificar ejecutadas
const executed = ordered.conversation.filter(c => c.executed).length;
const notExecuted = ordered.conversation.filter(c => !c.executed);

console.log('\n📊 Ejecución:');
console.log(`   Ejecutadas: ${executed}/${ordered.conversation.length}`);
console.log(`   Cobertura: ${((executed / ordered.conversation.length) * 100).toFixed(1)}%`);

if (notExecuted.length > 0) {
  console.log(`\n❌ Frases NO ejecutadas (${notExecuted.length}):`);
  notExecuted.slice(0, 10).forEach(n => {
    console.log(`   [${n.index}] ${n.intent}: ${n.phrase.substring(0, 50)}...`);
  });
}

// Verificar que todas tienen mensajes
const withMessages = ordered.conversation.filter(c => c.messages && c.messages.length > 0);
console.log(`\n📊 Mensajes:`);
console.log(`   Con mensajes: ${withMessages.length}/${ordered.conversation.length}`);

// Muestra ejemplo de estructura
console.log('\n📋 Ejemplo de estructura (primera entrada):');
const first = ordered.conversation[0];
console.log(`   index: ${first.index}`);
console.log(`   intent: ${first.intent}`);
console.log(`   phrase: ${first.phrase.substring(0, 50)}...`);
console.log(`   executed: ${first.executed}`);
console.log(`   messages: ${first.messages.length} mensajes`);
if (first.messages.length > 0) {
  console.log(`     [0] type=${first.messages[0].type}, text="${first.messages[0].text?.substring(0, 40)}..."`);
}
