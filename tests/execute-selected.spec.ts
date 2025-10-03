import { test, expect } from './_setup';
import { INTENTS, VARS } from './setup/data';
import * as fs from 'fs';
import * as path from 'path';

// Timeout extendido para permitir múltiples intents
test.setTimeout(24 * 60 * 60 * 1000); // 24 horas

// Buscar archivo temporal de ejecución
const tempFiles = fs.readdirSync(process.cwd()).filter(f => f.startsWith('temp-exec-'));
let executionConfig: any = null;

if (tempFiles.length > 0) {
  const latestFile = tempFiles.sort().reverse()[0];
  const content = fs.readFileSync(path.join(process.cwd(), latestFile), 'utf8');
  executionConfig = JSON.parse(content);
  console.log(`\n[Execution] 📋 Usando config: ${latestFile}`);
  console.log(`[Execution] 🎯 Total ejemplos: ${executionConfig.examples.length}`);
}

// Agrupar ejemplos por intent
const examplesMap: Record<string, string[]> = {};

if (executionConfig && executionConfig.examples) {
  executionConfig.examples.forEach((item: any) => {
    if (!examplesMap[item.intent]) {
      examplesMap[item.intent] = [];
    }
    examplesMap[item.intent].push(item.example);
  });
  
  console.log(`[Execution] 📊 Intents involucrados:`);
  Object.entries(examplesMap).forEach(([intent, examples]) => {
    console.log(`  - ${intent}: ${examples.length} ejemplos`);
  });
} else {
  // Fallback: usar todos los intents si no hay config
  Object.entries(INTENTS).forEach(([intent, examples]) => {
    examplesMap[intent] = examples as string[];
  });
  console.log(`[Execution] ⚠️  Sin config específica, usando TODOS los intents`);
}

// Test principal que ejecuta todos los ejemplos seleccionados
test('Ejemplos seleccionados - Ejecución automática', async ({ runAutoLoop, conversation }) => {
  const fails: string[] = [];
  let totalProcessed = 0;
  const totalExamples = Object.values(examplesMap).flat().length;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 INICIANDO EJECUCIÓN DE ${totalExamples} EJEMPLOS`);
  console.log('='.repeat(80));

  // Iterar sobre cada intent y sus ejemplos
  for (const [intentName, examples] of Object.entries(examplesMap)) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📂 INTENT: ${intentName} (${examples.length} ejemplos)`);
    console.log('─'.repeat(80));

    for (let i = 0; i < examples.length; i++) {
      totalProcessed++;
      const starter = examples[i];
      
      console.log(`\n[${totalProcessed}/${totalExamples}] 📝 "${starter}"`);
      conversation.logIntent(`[${totalProcessed}/${totalExamples}] ${intentName} › ${starter}`, totalProcessed, totalExamples);

      const result = await runAutoLoop(starter, { resetChat: true });
      
      if (result.success) {
        console.log(`✅ OK`);
      } else {
        console.log(`❌ FAIL: ${result.reason}`);
        fails.push(`[${intentName}] "${starter}" → ${result.reason}`);
      }
    }
  }

  // Resumen final
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 RESUMEN DE EJECUCIÓN`);
  console.log('='.repeat(80));
  console.log(`Total ejemplos: ${totalExamples}`);
  console.log(`✅ Exitosos: ${totalExamples - fails.length}`);
  console.log(`❌ Fallidos: ${fails.length}`);
  
  if (fails.length > 0) {
    console.log(`\n🔍 DETALLES DE FALLOS:`);
    fails.forEach((fail, idx) => {
      console.log(`  ${idx + 1}. ${fail}`);
    });
  }
  console.log('='.repeat(80));

  // Evaluar al final para no cortar ejecución
  expect.soft(fails, fails.join('\n')).toHaveLength(0);
});

// Limpieza después del test
test.afterAll(async () => {
  if (tempFiles.length > 0) {
    const tempFile = tempFiles[0];
    try {
      fs.unlinkSync(path.join(process.cwd(), tempFile));
      console.log(`\n[Cleanup] 🗑️  Archivo temporal eliminado: ${tempFile}`);
    } catch (err) {
      console.error(`[Cleanup] ⚠️  Error al eliminar ${tempFile}:`, err);
    }
  }
});
