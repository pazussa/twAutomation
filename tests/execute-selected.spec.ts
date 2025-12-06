import { test, expect } from './_setup';
import { INTENTS, VARS } from './setup/data';
import * as fs from 'fs';
import * as path from 'path';

// Timeout extendido para permitir múltiples intents
test.setTimeout(24 * 60 * 60 * 1000); // 24 horas

// Estado global para manejar interrupciones
let isInterrupted = false;
let interruptionHandled = false;
let currentPage: any = null; // Referencia al page actual para enviar "cancelar"

// Archivo de señal de pausa (creado por el servidor)
const pauseSignalFile = path.join(process.cwd(), '.pause-signal');

// Función para verificar si hay solicitud de pausa
function checkPauseSignal(): boolean {
  try {
    if (fs.existsSync(pauseSignalFile)) {
      console.log('\n📄 Señal de pausa detectada desde la interfaz');
      // Eliminar el archivo de señal
      fs.unlinkSync(pauseSignalFile);
      return true;
    }
  } catch (e) {
    // Ignorar errores
  }
  return false;
}

// Capturar SIGINT (desde botón Pausar en UI o Ctrl+C)
process.on('SIGINT', async () => {
  if (!interruptionHandled) {
    console.log('\n\n⏸ PAUSA SOLICITADA');
    console.log('📊 Finalizando ejemplo actual y guardando checkpoint...');
    isInterrupted = true;
    interruptionHandled = true;
    
    // Enviar "cancelar" para limpiar conversación actual en WhatsApp
    if (currentPage) {
      console.log('📤 Enviando "cancelar" para limpiar conversación...');
      try {
        const { typeIntoComposer } = await import('./setup/utils');
        await typeIntoComposer(currentPage, 'cancelar');
        await currentPage.waitForTimeout(1500).catch(() => {});
        console.log('✅ "cancelar" enviado exitosamente');
      } catch (e: any) {
        console.log('⚠️  No se pudo enviar "cancelar":', e?.message || 'Browser cerrado');
      }
    }
    
    console.log('💾 Guardando progreso...');
  }
  // No hay segundo SIGINT - el servidor controla el proceso
});

process.on('SIGTERM', async () => {
  if (!interruptionHandled) {
    console.log('\n\n⏸ CIERRE SOLICITADO (SIGTERM)');
    console.log('📊 Finalizando y guardando checkpoint...');
    isInterrupted = true;
    interruptionHandled = true;
    
    if (currentPage) {
      console.log('📤 Enviando "cancelar" para limpiar conversación...');
      try {
        const { typeIntoComposer } = await import('./setup/utils');
        await typeIntoComposer(currentPage, 'cancelar');
        await currentPage.waitForTimeout(1500).catch(() => {});
        console.log('✅ "cancelar" enviado exitosamente');
      } catch (e: any) {
        console.log('⚠️  No se pudo enviar "cancelar":', e?.message || 'Browser cerrado');
      }
    }
    
    console.log('💾 Guardando progreso...');
  }
});

// Buscar archivo temporal de ejecución
const tempFiles = fs.readdirSync(process.cwd()).filter(f => f.startsWith('temp-exec-'));
let executionConfig: any = null;
let checkpointFile: string | null = null;
let checkpoint: any = null;
let executionId: string | null = null; // ID compartido para todas las ejecuciones/reanudaciones

if (tempFiles.length > 0) {
  const latestFile = tempFiles.sort().reverse()[0];
  executionId = latestFile.replace('temp-exec-', '').replace('.json', '');
  const content = fs.readFileSync(path.join(process.cwd(), latestFile), 'utf8');
  executionConfig = JSON.parse(content);
  console.log(`\n[Execution] 📋 Usando config: ${latestFile}`);
  console.log(`[Execution] 🎯 Total ejemplos: ${executionConfig.examples.length}`);
  console.log(`[Execution] 🆔 Execution ID: ${executionId}`);
  
  // Buscar checkpoint asociado
  const checkpointPath = path.join(process.cwd(), latestFile.replace('temp-exec-', 'checkpoint-'));
  if (fs.existsSync(checkpointPath)) {
    checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    checkpointFile = checkpointPath;
    console.log(`\n[Checkpoint] 🔄 REANUDANDO EJECUCIÓN INTERRUMPIDA`);
    console.log(`[Checkpoint] 📍 Progreso anterior: ${checkpoint.totalProcessed}/${checkpoint.totalExamples} ejemplos`);
    console.log(`[Checkpoint] 🎯 Último intent completado: ${checkpoint.lastCompletedIntent || 'ninguno'}`);
    console.log(`[Checkpoint] ⏭️  Siguiente intent: ${checkpoint.nextIntent}`);
    console.log(`[Checkpoint] 🔁 Interrupciones previas: ${checkpoint.interruptionCount || 0}`);
  }
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

// Ordenar intents: primero los que empiezan con "create", luego el resto
const sortedIntents = Object.keys(examplesMap).sort((a, b) => {
  const aIsCreate = a.toLowerCase().startsWith('create');
  const bIsCreate = b.toLowerCase().startsWith('create');
  
  // Si uno es create y el otro no, el create va primero
  if (aIsCreate && !bIsCreate) return -1;
  if (!aIsCreate && bIsCreate) return 1;
  
  // Si ambos son create o ambos no son create, mantener orden alfabético
  return a.localeCompare(b);
});

// Reconstruir examplesMap con el orden correcto
const sortedExamplesMap: Record<string, string[]> = {};
sortedIntents.forEach(intent => {
  sortedExamplesMap[intent] = examplesMap[intent];
});

console.log(`[Execution] 🔄 Orden de ejecución (create primero):`);
Object.entries(sortedExamplesMap).forEach(([intent, examples]) => {
  const tag = intent.toLowerCase().startsWith('create') ? '🆕' : '📋';
  console.log(`  ${tag} ${intent}: ${examples.length} ejemplos`);
});

// Función para guardar checkpoint
function saveCheckpoint(data: any) {
  if (!checkpointFile && tempFiles.length > 0) {
    checkpointFile = path.join(process.cwd(), tempFiles[0].replace('temp-exec-', 'checkpoint-'));
  }
  if (checkpointFile) {
    // El interruptionCount ya viene incrementado desde donde se llama
    fs.writeFileSync(checkpointFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\n[Checkpoint] 💾 Checkpoint guardado (pausa #${data.interruptionCount || 1})`);
  }
}

// Test principal que ejecuta todos los ejemplos seleccionados
// Usar un nombre consistente basado en executionId para que todas las ejecuciones vayan al mismo reporte
const testName = executionId 
  ? `Ejecución ${executionId} - Automática` 
  : 'Ejemplos seleccionados - Ejecución automática';

test(testName, async ({ page, runAutoLoop, conversation }) => {
  // Guardar referencia al page para usarlo en el manejador de SIGINT
  currentPage = page;
  
  const fails: string[] = [];
  let totalProcessed = checkpoint?.totalProcessed || 0;
  const totalExamples = Object.values(sortedExamplesMap).flat().length;
  let lastCompletedIntent: string | null = checkpoint?.lastCompletedIntent || null;
  let currentIntent: string | null = null; // Intent que se está ejecutando actualmente
  let currentExampleIndex: number = 0; // Índice del ejemplo actual dentro del intent
  let shouldSkip = checkpoint !== null; // Si hay checkpoint, empezamos saltando intents
  let skipExamplesUntil = checkpoint?.currentExampleIndex || 0; // Ejemplos a saltar en el intent de reanudación
  const interruptionCount = checkpoint?.interruptionCount || 0;
  
  // Auto-save cada 5 minutos
  const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutos en milisegundos
  let lastAutoSave = Date.now();
  let autoSaveCount = 0;
  
  // Función para hacer auto-save del checkpoint y reporte
  const performAutoSave = () => {
    if (isInterrupted) return; // No hacer auto-save si ya se interrumpió
    
    autoSaveCount++;
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`💾 AUTO-SAVE #${autoSaveCount} (cada 5 min)`);
    console.log(`📊 Progreso: ${totalProcessed}/${totalExamples} ejemplos`);
    
    // Guardar checkpoint
    saveCheckpoint({
      totalProcessed,
      totalExamples,
      lastCompletedIntent,
      currentIntent,
      currentExampleIndex,
      interrupted: false, // No es una interrupción, es auto-save
      interruptionCount,
      autoSaveCount,
      timestamp: new Date().toISOString(),
      executionId
    });
    
    // Notificar al servidor para que genere reporte parcial
    const autoSaveSignalFile = path.join(process.cwd(), '.autosave-signal');
    try {
      fs.writeFileSync(autoSaveSignalFile, JSON.stringify({
        timestamp: Date.now(),
        executionId,
        totalProcessed,
        totalExamples,
        autoSaveCount
      }), 'utf8');
    } catch (e) {
      // Ignorar errores
    }
    
    console.log(`✅ Checkpoint guardado`);
    console.log('─'.repeat(40));
    
    lastAutoSave = Date.now();
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 ${checkpoint ? 'REANUDANDO' : 'INICIANDO'} EJECUCIÓN DE ${totalExamples} EJEMPLOS`);
  if (checkpoint) {
    console.log(`📍 Progreso previo: ${totalProcessed} ejemplos completados`);
    console.log(`🔁 Interrupciones previas: ${interruptionCount}`);
  }
  console.log(`💾 Auto-guardado cada 5 minutos activado`);
  console.log(`🆔 Execution ID: ${executionId || 'N/A'}`);
  console.log('='.repeat(80));

  // Guardar referencia al conversation logger para usarlo en el finally
  let conversationData = conversation;

  try {
    // Iterar sobre cada intent y sus ejemplos (ahora en orden: create primero)
    for (const [intentName, examples] of Object.entries(sortedExamplesMap)) {
      currentIntent = intentName; // Actualizar intent actual
      
      // Si estamos reanudando y este intent ya se completó, saltarlo
      if (shouldSkip) {
        if (intentName === checkpoint.currentIntent) {
          // Llegamos al intent donde debemos reanudar
          shouldSkip = false;
          if (skipExamplesUntil > 0) {
            console.log(`\n[Checkpoint] ✅ Reanudando desde: ${intentName} (ejemplo ${skipExamplesUntil + 1})`);
          } else {
            console.log(`\n[Checkpoint] ✅ Reanudando desde: ${intentName}`);
          }
        } else {
          console.log(`\n[Checkpoint] ⏭️  Saltando intent ya completado: ${intentName}`);
          continue;
        }
      }
      
      // Verificar si hubo interrupción
      if (isInterrupted) {
        console.log(`\n⚠️  Ejecución interrumpida por el usuario`);
        break;
      }

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📂 INTENT: ${intentName} (${examples.length} ejemplos)`);
      console.log('─'.repeat(80));

      let intentCompleted = true; // Asumimos que se completará

      for (let i = 0; i < examples.length; i++) {
        currentExampleIndex = i; // Actualizar índice del ejemplo actual
        
        // Si estamos reanudando, saltar ejemplos ya procesados
        if (skipExamplesUntil > 0 && i < skipExamplesUntil) {
          console.log(`[Checkpoint] ⏭️  Saltando ejemplo ${i + 1}/${examples.length} (ya procesado)`);
          continue;
        }
        skipExamplesUntil = 0; // Reset después del primer intent reanudado
        
        // Verificar señal de pausa desde la interfaz (archivo .pause-signal)
        if (checkPauseSignal()) {
          console.log('⏸ Pausando ejecución...');
          isInterrupted = true;
          interruptionHandled = true;
        }
        
        // Verificar si hubo interrupción antes de cada ejemplo
        if (isInterrupted) {
          console.log(`\n⚠️  Ejecución interrumpida por el usuario`);
          intentCompleted = false;
          break;
        }

        totalProcessed++;
        const starter = examples[i];
        
        console.log(`\n[${totalProcessed}/${totalExamples}] 📝 "${starter}"`);
        conversation.logIntent(`[${totalProcessed}/${totalExamples}] ${intentName} › ${starter}`, totalProcessed, totalExamples);

        try {
          const result = await runAutoLoop(starter, { resetChat: true, intentName });
          
          if (result.success) {
            console.log(`✅ OK`);
          } else {
            console.log(`❌ FAIL: ${result.reason}`);
            fails.push(`[${intentName}] "${starter}" → ${result.reason}`);
          }
        } catch (error) {
          console.log(`❌ ERROR: ${error}`);
          fails.push(`[${intentName}] "${starter}" → Error: ${error}`);
        }
        
        // Verificar si es tiempo de hacer auto-save (cada 5 minutos)
        if (Date.now() - lastAutoSave >= AUTO_SAVE_INTERVAL) {
          await performAutoSave();
        }
      }

      // Si el intent se completó, actualizarlo
      if (intentCompleted && !isInterrupted) {
        lastCompletedIntent = intentName;
      }
    }
  } finally {
    // Este bloque SIEMPRE se ejecuta, incluso con Ctrl+C
    
    // Si fue interrumpido, guardar checkpoint antes del resumen
    if (isInterrupted) {
      // Incrementar contador de interrupciones
      const newInterruptionCount = (checkpoint?.interruptionCount || 0) + 1;
      
      // Guardar checkpoint con el intent actual y el índice del ejemplo
      // currentExampleIndex apunta al ejemplo que se estaba ejecutando (o el siguiente a ejecutar)
      saveCheckpoint({
        totalProcessed,
        totalExamples,
        lastCompletedIntent,
        currentIntent, // El intent que se estaba ejecutando
        currentExampleIndex, // El índice del ejemplo donde quedó (0-based)
        interrupted: true,
        interruptionCount: newInterruptionCount,
        timestamp: new Date().toISOString(),
        executionId
      });
    }
    
    // Resumen final
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 RESUMEN DE EJECUCIÓN ${isInterrupted ? '(INTERRUMPIDA)' : ''}`);
    console.log('='.repeat(80));
    console.log(`Total ejemplos planificados: ${totalExamples}`);
    console.log(`Total ejemplos procesados: ${totalProcessed}`);
    console.log(`✅ Exitosos: ${totalProcessed - fails.length}`);
    console.log(`❌ Fallidos: ${fails.length}`);
    
    if (isInterrupted) {
      console.log(`⚠️  Ejemplos no ejecutados: ${totalExamples - totalProcessed}`);
      console.log(`💾 Checkpoint guardado. Ejecuta de nuevo para reanudar.`);
      console.log(`🔁 Total de interrupciones hasta ahora: ${(checkpoint?.interruptionCount || 0) + 1}`);
    }
    
    if (fails.length > 0) {
      console.log(`\n🔍 DETALLES DE FALLOS:`);
      fails.forEach((fail, idx) => {
        console.log(`  ${idx + 1}. ${fail}`);
      });
    }
    console.log('='.repeat(80));
    
    if (isInterrupted) {
      console.log('\n⏳ Generando reporte HTML con conversaciones completadas...');
      console.log('📄 El PDF se generará automáticamente después.');
      console.log('🔄 Al reanudar, el PDF se actualizará con las nuevas conversaciones.');
      // Esperar un poco para que Playwright procese los attachments antes de terminar
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Reporte generado\n');
    } else {
      console.log('\n✅ Ejecución completada. Generando reporte HTML y PDF final...\n');
    }
  }

  // Evaluar al final para no cortar ejecución
  // Si fue interrumpido, no fallar el test para que se genere el reporte
  if (!isInterrupted) {
    expect.soft(fails, fails.join('\n')).toHaveLength(0);
  }
});

// Limpieza después del test
test.afterAll(async () => {
  // Limpiar referencia al page
  currentPage = null;
  
  // SIEMPRE conservar archivos (nunca borrar)
  if (tempFiles.length > 0) {
    console.log(`\n[Cleanup] 💾 Archivos conservados: ${tempFiles.join(', ')}`);
  }
  if (checkpointFile && fs.existsSync(checkpointFile)) {
    console.log(`[Cleanup] 💾 Checkpoint conservado: ${path.basename(checkpointFile)}`);
  }
});
