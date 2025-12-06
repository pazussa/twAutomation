/**
 * Script para ejecutar SOLO las 152 frases faltantes
 * Crea un nuevo temp-exec con las frases que faltan y las ejecuta
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const EXECUTION_ID = '496810a435e88506';

console.log('🔍 Identificando frases faltantes...\n');

// Leer temp-exec original
const tempExec = JSON.parse(fs.readFileSync(`temp-exec-${EXECUTION_ID}-original.json`, 'utf8'));
console.log(`📋 Total frases en temp-exec: ${tempExec.examples.length}`);

// Leer conversación
const conv = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}.json`, 'utf8'));

// Extraer todas las frases ejecutadas de la conversación (con conteo)
const executedPhrases = new Map();
conv.events.filter(e => e.kind === 'intent').forEach(e => {
  const match = e.text.match(/ › (.+)/);
  if (match) {
    const phrase = match[1].trim();
    executedPhrases.set(phrase, (executedPhrases.get(phrase) || 0) + 1);
  }
});

console.log(`📋 Frases únicas ejecutadas: ${executedPhrases.size}`);

// Identificar faltantes
const missing = [];
const usedCount = new Map();

tempExec.examples.forEach((ex, idx) => {
  const used = usedCount.get(ex.example) || 0;
  const available = executedPhrases.get(ex.example) || 0;
  
  if (used >= available) {
    missing.push({ 
      idx: idx + 1, 
      intent: ex.intent, 
      example: ex.example
    });
  } else {
    usedCount.set(ex.example, used + 1);
  }
});

console.log(`\n❌ Frases faltantes: ${missing.length}`);

if (missing.length === 0) {
  console.log('✅ No hay frases faltantes. Todo está completo!');
  process.exit(0);
}

// Agrupar por intent para mostrar resumen
const byIntent = {};
missing.forEach(m => {
  if (!byIntent[m.intent]) byIntent[m.intent] = [];
  byIntent[m.intent].push(m);
});

console.log('\nFaltantes por intent:');
Object.entries(byIntent).sort((a,b) => b[1].length - a[1].length).forEach(([intent, items]) => {
  console.log(`  ${intent}: ${items.length}`);
});

// Crear nuevo temp-exec solo con las frases faltantes
const newTempExec = {
  createdAt: new Date().toISOString(),
  intents: [...new Set(missing.map(m => m.intent))],
  examples: missing.map(m => ({ intent: m.intent, example: m.example })),
  originalExecution: EXECUTION_ID,
  purpose: 'Execute missing phrases only'
};

// Generar nuevo ID para esta ejecución parcial
const newExecutionId = 'missing-' + Date.now().toString(16);
const newTempExecPath = `temp-exec-${newExecutionId}.json`;

fs.writeFileSync(newTempExecPath, JSON.stringify(newTempExec, null, 2));
console.log(`\n✅ Creado: ${newTempExecPath}`);
console.log(`   Total frases a ejecutar: ${missing.length}`);

console.log('\n🚀 Iniciando ejecución de frases faltantes...');
console.log('   Presiona Ctrl+C para pausar en cualquier momento.\n');

// Ejecutar el test
try {
  execSync('npx playwright test tests/execute-selected.spec.ts --reporter=./tests/conversation-reporter.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (e) {
  console.log('\n⚠️ Ejecución terminada (posible interrupción o error)');
}

console.log('\n📊 Ejecución completada. Ahora fusionando resultados...');

// Después de la ejecución, fusionar los resultados
const newConvPath = `conversation-${newExecutionId}.json`;
if (fs.existsSync(newConvPath)) {
  console.log(`📂 Encontrado: ${newConvPath}`);
  
  const newConv = JSON.parse(fs.readFileSync(newConvPath, 'utf8'));
  console.log(`   Nuevos eventos: ${newConv.events.length}`);
  
  // Fusionar con la conversación original
  const mergedConv = {
    ...conv,
    events: [...conv.events, ...newConv.events]
  };
  
  // Guardar conversación fusionada
  const mergedPath = `conversation-${EXECUTION_ID}-merged.json`;
  fs.writeFileSync(mergedPath, JSON.stringify(mergedConv, null, 2));
  console.log(`✅ Conversación fusionada: ${mergedPath}`);
  console.log(`   Total eventos: ${mergedConv.events.length}`);
  
  // Reemplazar la original
  fs.copyFileSync(`conversation-${EXECUTION_ID}.json`, `conversation-${EXECUTION_ID}-backup.json`);
  fs.writeFileSync(`conversation-${EXECUTION_ID}.json`, JSON.stringify(mergedConv, null, 2));
  console.log(`✅ Conversación original actualizada`);
} else {
  console.log(`⚠️ No se encontró archivo de conversación nuevo: ${newConvPath}`);
}

console.log('\n🔄 Regenerando reporte final...');
