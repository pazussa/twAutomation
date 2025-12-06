/**
 * Test para ejecutar SOLO las frases faltantes de una ejecución previa
 * 
 * Este test:
 * 1. Lee el archivo temp-exec-missing-*.json con las frases pendientes
 * 2. Ejecuta cada una manteniendo el índice original
 * 3. Guarda los resultados en conversation-*-missing.json
 * 4. Al final, se debe ejecutar merge-final-report.mjs para unir todo
 */

import { test, expect } from './setup/flow';
import { withVars } from './setup/data';
import * as fs from 'fs';
import * as path from 'path';

// Configuración
const ORIGINAL_EXECUTION_ID = '496810a435e88506';
const MISSING_EXEC_FILE = `temp-exec-missing-${ORIGINAL_EXECUTION_ID}.json`;
const CHECKPOINT_FILE = `checkpoint-${ORIGINAL_EXECUTION_ID}-missing.json`;

// Client name fijo para evitar María García
const CLIENT_NAME = 'Automatización Clnt';

interface MissingExample {
  intent: string;
  example: string;
  originalIndex: number;
}

interface MissingTempExec {
  executionId: string;
  examples: MissingExample[];
}

interface Checkpoint {
  totalProcessed: number;
  totalExamples: number;
  currentExampleIndex: number;
  timestamp: string;
}

// Cargar datos
function loadMissingExec(): MissingTempExec | null {
  const filePath = path.join(process.cwd(), MISSING_EXEC_FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No existe ${MISSING_EXEC_FILE}. Ejecuta primero: node scripts/execute-missing-phrases.mjs`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCheckpoint(): Checkpoint | null {
  const filePath = path.join(process.cwd(), CHECKPOINT_FILE);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  const filePath = path.join(process.cwd(), CHECKPOINT_FILE);
  fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));
}

test.describe('Ejecutar frases faltantes', () => {
  test(`Ejecución ${ORIGINAL_EXECUTION_ID}-missing - Frases Faltantes`, async ({ 
    page, 
    runAutoLoop, 
    conversation 
  }) => {
    const missingExec = loadMissingExec();
    if (!missingExec) {
      console.error('No se pudo cargar el archivo de frases faltantes');
      return;
    }

    const examples = missingExec.examples;
    const total = examples.length;
    
    // Cargar checkpoint para reanudar si existe
    let checkpoint = loadCheckpoint();
    let startFrom = checkpoint?.currentExampleIndex || 0;
    
    console.log(`\n🚀 Iniciando ejecución de ${total} frases faltantes`);
    console.log(`   Reanudando desde: ${startFrom}`);

    for (let i = startFrom; i < total; i++) {
      const ex = examples[i];
      const phrase = ex.example;
      const intentName = ex.intent;
      const originalIdx = ex.originalIndex;
      
      // Log con índice original para trazabilidad
      const label = `[${i + 1}/${total}] (orig:${originalIdx}) ${intentName} › ${phrase}`;
      conversation.logIntent(label, originalIdx, 919); // 919 = total original
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📌 ${label}`);
      console.log(`${'='.repeat(60)}`);

      // Aplicar variables del pool - usar cliente fijo
      withVars({ client_name: CLIENT_NAME });

      // Ejecutar la frase
      const result = await runAutoLoop(phrase, { 
        resetChat: true, 
        intentName 
      });

      if (result.success) {
        console.log(`✅ Éxito: ${phrase.substring(0, 50)}...`);
      } else {
        console.log(`⚠️ Problema: ${result.reason}`);
      }

      // Actualizar checkpoint
      checkpoint = {
        totalProcessed: i + 1,
        totalExamples: total,
        currentExampleIndex: i + 1,
        timestamp: new Date().toISOString()
      };
      saveCheckpoint(checkpoint);

      // Pausa entre frases
      await page.waitForTimeout(2000);
    }

    console.log(`\n🎉 Ejecución de frases faltantes completada!`);
    console.log(`   Ejecutadas: ${total} frases`);
    console.log(`\n📝 Ahora ejecuta: node scripts/merge-final-report.mjs`);
  });
});
