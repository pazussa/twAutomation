import { test } from './setup/flow';
import { CFG, VARS, setVar, resetVarsToDefaults } from './setup/data';

test.describe('Create Intent Set - Todos los Intents de Creación (create*)', () => {
  
  test.beforeEach(async () => {
    resetVarsToDefaults();
  });

  // 1. CREATE CHEMICAL PRODUCT - 5 frases representativas  
  test('CreateChemicalProduct - Set de Creación', async ({ runAutoLoop }) => {
    const creationPhrases = [
      'quiero registrar un producto químico',
      'crear producto químico',
      'quiero añadir un nuevo producto químico', 
      'necesito crear un producto químico',
      'registrar un nuevo producto químico'
    ];

    for (const phrase of creationPhrases) {
      console.log(`\n🧪 [CREATE CHEMICAL PRODUCT] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 2. CREATE CROP - 5 frases representativas
  test('CreateCrop - Set de Creación', async ({ runAutoLoop }) => {
    const creationPhrases = [
      'quiero registrar un cultivo',
      'crear cultivo', 
      'registrar un nuevo cultivo',
      'me gustaría crear un cultivo nuevo',
      'voy a crear un cultivo'
    ];

    for (const phrase of creationPhrases) {
      console.log(`\n🌱 [CREATE CROP] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 3. CREATE FERTILIZER - 5 frases representativas
  test('CreateFertilizer - Set de Creación', async ({ runAutoLoop }) => {
    const creationPhrases = [
      'quiero registrar un fertilizante',
      'crear fertilizante',
      'quiero añadir un nuevo fertilizante',
      'necesito crear un fertilizante', 
      'registrar un nuevo fertilizante'
    ];

    for (const phrase of creationPhrases) {
      console.log(`\n🌿 [CREATE FERTILIZER] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 4. CREATE PLANNED CAMPAIGN - 5 frases representativas
  test('CreatePlannedCampaign - Set de Creación', async ({ runAutoLoop }) => {
    const creationPhrases = [
      'pon trigo en la parcela campo',
      'planifica maíz en prueba',
      'quiero poner cebada variedad Golden en la parcela campo',
      'crear una campaña planificada',
      'planificar una campaña'
    ];

    for (const phrase of creationPhrases) {
      console.log(`\n📅 [CREATE PLANNED CAMPAIGN] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 5. CREATE PLANNED WORK - 3 frases reales (no inventar)
  test('CreatePlannedWork - Set de Creación', async ({ runAutoLoop }) => {
    const creationPhrases = [
      'crear un trabajo planificado',
      'planificar un trabajo',
      'quiero crear un trabajo en una campaña'
    ];

    for (const phrase of creationPhrases) {
      console.log(`\n📋 [CREATE PLANNED WORK] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

});