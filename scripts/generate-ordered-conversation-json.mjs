/**
 * Genera un JSON condensado con toda la conversación ordenada
 * correspondiente 1:1 con el temp-exec original
 */

import fs from 'fs';

const EXECUTION_ID = '496810a435e88506';

console.log('🔄 Generando JSON condensado de conversación...\n');

// Leer temp-exec original (919 frases en orden)
const tempExec = JSON.parse(fs.readFileSync(`temp-exec-${EXECUTION_ID}-original.json`, 'utf8'));
console.log(`📋 Total frases en temp-exec: ${tempExec.examples.length}`);

// Leer conversación fusionada
const conv = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}.json`, 'utf8'));
console.log(`📋 Total eventos en conversación: ${conv.events.length}`);

// Crear mapa de frase -> eventos de ejecución
const phraseExecutions = new Map();

let currentIntentEvents = null;
conv.events.forEach(event => {
  if (event.kind === 'intent') {
    if (currentIntentEvents) {
      const match = currentIntentEvents.intent.text.match(/ › (.+)/);
      if (match) {
        const phrase = match[1].trim();
        if (!phraseExecutions.has(phrase)) {
          phraseExecutions.set(phrase, []);
        }
        phraseExecutions.get(phrase).push(currentIntentEvents);
      }
    }
    currentIntentEvents = {
      intent: event,
      messages: []
    };
  } else if (currentIntentEvents) {
    currentIntentEvents.messages.push(event);
  }
});

// No olvidar el último intent
if (currentIntentEvents) {
  const match = currentIntentEvents.intent.text.match(/ › (.+)/);
  if (match) {
    const phrase = match[1].trim();
    if (!phraseExecutions.has(phrase)) {
      phraseExecutions.set(phrase, []);
    }
    phraseExecutions.get(phrase).push(currentIntentEvents);
  }
}

// Construir JSON ordenado según temp-exec
const orderedConversation = [];
const usedExecutions = new Map();

tempExec.examples.forEach((ex, idx) => {
  const executions = phraseExecutions.get(ex.example);
  const usedCount = usedExecutions.get(ex.example) || 0;
  
  let execution = null;
  if (executions && executions.length > usedCount) {
    execution = executions[usedCount];
    usedExecutions.set(ex.example, usedCount + 1);
  }
  
  const entry = {
    index: idx + 1,
    intent: ex.intent,
    phrase: ex.example,
    executed: !!execution,
    messages: []
  };
  
  if (execution) {
    entry.timestamp = execution.intent.t;
    entry.messages = execution.messages.map(m => ({
      type: m.kind,
      text: m.text,
      time: m.t,
      ok: m.ok
    }));
  }
  
  orderedConversation.push(entry);
});

// Estadísticas
const executed = orderedConversation.filter(e => e.executed).length;
const coverage = ((executed / tempExec.examples.length) * 100).toFixed(1);

const result = {
  executionId: EXECUTION_ID,
  generatedAt: new Date().toISOString(),
  summary: {
    totalPhrases: tempExec.examples.length,
    executed: executed,
    missing: tempExec.examples.length - executed,
    coverage: `${coverage}%`
  },
  intents: [...new Set(tempExec.examples.map(e => e.intent))],
  conversation: orderedConversation
};

const outputPath = `conversation-${EXECUTION_ID}-ordenada.json`;
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log(`\n${'='.repeat(50)}`);
console.log('RESULTADO');
console.log('='.repeat(50));
console.log(`✅ Guardado: ${outputPath}`);
console.log(`   Frases: ${result.summary.totalPhrases}`);
console.log(`   Ejecutadas: ${result.summary.executed}`);
console.log(`   Cobertura: ${result.summary.coverage}`);

// Mostrar tamaño del archivo
const stats = fs.statSync(outputPath);
console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
