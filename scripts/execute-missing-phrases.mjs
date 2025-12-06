/**
 * Script para ejecutar SOLO las frases faltantes y agregarlas al reporte
 * 
 * Este script:
 * 1. Lee el temp-exec actual y la conversación existente
 * 2. Identifica las frases que NO se ejecutaron
 * 3. Crea un nuevo temp-exec SOLO con las faltantes
 * 4. Al finalizar, fusiona todo en un reporte ordenado correctamente
 */

import fs from 'fs';
import path from 'path';

const EXECUTION_ID = '496810a435e88506';
const TEMP_EXEC_FILE = `temp-exec-${EXECUTION_ID}.json`;
const CONVERSATION_FILE = `conversation-${EXECUTION_ID}.json`;

// Verificar que existe el archivo original (puede estar como backup)
let tempExecPath = TEMP_EXEC_FILE;
if (!fs.existsSync(tempExecPath)) {
  tempExecPath = `temp-exec-${EXECUTION_ID}-original.json`;
  if (!fs.existsSync(tempExecPath)) {
    tempExecPath = `temp-exec-${EXECUTION_ID}-backup.json`;
  }
}

if (!fs.existsSync(tempExecPath)) {
  console.error(`❌ No se encontró archivo temp-exec para ${EXECUTION_ID}`);
  process.exit(1);
}

// Verificar conversación
let convPath = CONVERSATION_FILE;
if (!fs.existsSync(convPath)) {
  convPath = `conversation-${EXECUTION_ID}-original.json`;
}

if (!fs.existsSync(convPath)) {
  console.error(`❌ No se encontró archivo conversation para ${EXECUTION_ID}`);
  process.exit(1);
}

// Leer archivos
console.log('📖 Leyendo archivos...');
console.log(`   temp-exec: ${tempExecPath}`);
console.log(`   conversation: ${convPath}`);

const tempExec = JSON.parse(fs.readFileSync(tempExecPath, 'utf8'));
const conv = JSON.parse(fs.readFileSync(convPath, 'utf8'));

// Extraer frases ejecutadas
const executed = new Set();
conv.events.filter(e => e.kind === 'intent').forEach(e => {
  const match = e.text.match(/› (.+)$/);
  if (match) {
    executed.add(match[1].trim());
  }
});

console.log(`✅ Frases ejecutadas encontradas: ${executed.size}`);

// Identificar frases faltantes con su índice original
const missingExamples = [];
tempExec.examples.forEach((ex, idx) => {
  if (!executed.has(ex.example)) {
    missingExamples.push({
      originalIndex: idx + 1, // 1-based
      intent: ex.intent,
      example: ex.example
    });
  }
});

console.log(`❌ Frases faltantes: ${missingExamples.length}`);

if (missingExamples.length === 0) {
  console.log('🎉 ¡Todas las frases ya fueron ejecutadas!');
  process.exit(0);
}

// Mostrar resumen por intent
const byIntent = {};
missingExamples.forEach(m => {
  if (!byIntent[m.intent]) byIntent[m.intent] = [];
  byIntent[m.intent].push(m);
});

console.log('\n📋 Frases faltantes por intent:');
Object.keys(byIntent).sort().forEach(intent => {
  console.log(`   ${intent}: ${byIntent[intent].length} frases`);
});

// Crear el archivo temp-exec para las faltantes
// IMPORTANTE: Usar el formato que espera execute-selected.spec.ts
const missingTempExec = {
  examples: missingExamples.map(m => ({
    intent: m.intent,
    example: m.example
  }))
};

const MISSING_EXEC_FILE = `temp-exec-missing-${EXECUTION_ID}.json`;
fs.writeFileSync(MISSING_EXEC_FILE, JSON.stringify(missingTempExec, null, 2));
console.log(`\n💾 Archivo creado: ${MISSING_EXEC_FILE}`);
console.log(`   Total ejemplos: ${missingTempExec.examples.length}`);

console.log('\n✅ Archivo preparado para ejecución.');

