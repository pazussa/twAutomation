import { test } from './setup/flow';
import { CFG, VARS, setVar, resetVarsToDefaults } from './setup/data';

test.describe('Non-Create Intent Set - Todos los Intents que NO son de Creación', () => {
  
  test.beforeEach(async () => {
    resetVarsToDefaults();
  });

  // 1. ASSIGN PRICE PRODUCT - 5 frases representativas
  test('AssignPriceProduct', async ({ runAutoLoop }) => {
    const phrases = [
      'asigna un precio de 340€/tonelada al Trigo Filón 2025-10-03',
      'establece 350 €/tn para el Trigo Filón 2025-10-03',
      'pon el Trigo Filón a 360 €/tn desde 2025-10-03',
      'quiero asignar para el Trigo Filón un precio de 340 euros/tn 2025-10-03',
      'sube el precio del Trigo Filón a 340 €/tn 2025-10-03'
    ];

    for (const phrase of phrases) {
      console.log(`\n💰 [ASSIGN PRICE PRODUCT] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 2. GET CHEMICAL PRODUCTS - 5 frases representativas
  test('GetChemicalProducts', async ({ runAutoLoop }) => {
    const phrases = [
      'dame los productos químicos que tengo',
      'muéstrame la lista de productos químicos',
      'químicos disponibles',
      'quiero consultar los pesticidas que tengo registrados',
      'lista todos los agroquímicos que tengo ahora'
    ];

    for (const phrase of phrases) {
      console.log(`\n🧪 [GET CHEMICAL PRODUCTS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 3. GET CROP DISTRIBUTION - 5 frases representativas
  test('GetCropDistribution', async ({ runAutoLoop }) => {
    const phrases = [
      'qué distribución de cultivos tengo este año?',
      'muéstrame los cultivos de este año',
      'cómo están repartidos mis cultivos?',
      'quiero ver qué cultivos tengo y en qué campos',
      'qué superficie tengo sembrada y con qué?'
    ];

    for (const phrase of phrases) {
      console.log(`\n📊 [GET CROP DISTRIBUTION] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 4. GET CROPS - 5 frases representativas
  test('GetCrops', async ({ runAutoLoop }) => {
    const phrases = [
      'dame la lista de cultivos',
      'quiero ver los cultivos',
      'muéstrame los cultivos disponibles',
      'muéstrame qué cultivos tengo ahora mismo en la finca',
      'listar todos los cultivos que tengo actualmente'
    ];

    for (const phrase of phrases) {
      console.log(`\n🌱 [GET CROPS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 5. GET LAST WORK - 5 frases representativas  
  test('GetLastWork', async ({ runAutoLoop }) => {
    const phrases = [
      'muéstrame el último trabajo',
      'quiero ver el último trabajo',
      'cuál fue el último trabajo realizado?',
      'último trabajo en prueba',
      'último trabajo del campo'
    ];

    for (const phrase of phrases) {
      console.log(`\n🔍 [GET LAST WORK] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 6. GET MIN PRICE - 5 frases representativas
  test('GetMinPrice', async ({ runAutoLoop }) => {
    const phrases = [
      'cuál es el precio mínimo del Girasol?',
      'dime el valor más bajo que ha tenido el Girasol',
      'a cómo ha estado el Girasol en su punto más bajo?',
      'cuánto ha sido lo más barato que me ha costado el Girasol?',
      'cuál es el menor precio registrado del Girasol?'
    ];

    for (const phrase of phrases) {
      console.log(`\n💰 [GET MIN PRICE] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 7. GET PENDING WORKS - 5 frases representativas
  test('GetPendingWorks', async ({ runAutoLoop }) => {
    const phrases = [
      'qué trabajos tengo para hacer hoy?',
      'qué trabajos tengo hoy?',
      'dime los trabajos pendientes',
      'qué trabajos están por hacer?',
      'cuántos trabajos hay pendientes?'
    ];

    for (const phrase of phrases) {
      console.log(`\n📋 [GET PENDING WORKS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 8. CHECK UNPLANNED FIELDS - 5 frases reales (de 9 disponibles)
  test('CheckUnplannedFields', async ({ runAutoLoop }) => {
    const phrases = [
      'Hola Luca, ¿me queda algún campo sin planificar?',
      'Luca, ¿tengo campos sin asignar cultivo?',
      '¿Hay algún campo que no tenga campaña este año?',
      'Dime si tengo algún campo que no esté planificado',
      'Luca, quiero saber si todos mis campos están cubiertos'
    ];

    for (const phrase of phrases) {
      console.log(`\n🔍 [CHECK UNPLANNED FIELDS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 9. FILTER FERTILIZERS - 5 frases representativas
  test('FilterFertilizers', async ({ runAutoLoop }) => {
    const phrases = [
      'qué fertilizantes con 20% de nitrógeno tengo',
      'muéstrame los fertilizantes líquidos',
      'fertilizantes con nitrógeno del 20%',
      'qué fertilizantes con más de 20% de nitrógeno tengo disponibles',
      'dime los fertilizantes que tienen nitrógeno 20'
    ];

    for (const phrase of phrases) {
      console.log(`\n🌿 [FILTER FERTILIZERS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 10. GET ACTIVE MATTER CHEMICAL PRODUCTS - 5 frases representativas
  test('GetActiveMatterChemicalProducts', async ({ runAutoLoop }) => {
    const phrases = [
      'que productos tienen diflufenican?',
      'que productos tienen diflufenican?',
      'listado de productos con diflufenican',
      'cuántos productos contienen diflufenican?',
      'que fitosanitarios tienen diflufenican?'
    ];

    for (const phrase of phrases) {
      console.log(`\n🧪 [GET ACTIVE MATTER CHEMICAL PRODUCTS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 11. GET CHEMICAL PRODUCTS BY CLIENT - 5 frases representativas
  test('GetChemicalProductsByClient', async ({ runAutoLoop }) => {
    const phrases = [
      'muéstrame los agroquímicos registrados por AgroMartín SL',
      'necesito ver la lista de pesticidas que usa AgroMartín SL',
      'dame los productos químicos del cliente AgroMartín SL',
      'cuáles plaguicidas tiene anotados AgroMartín SL?',
      'quiero consultar los insecticidas y fungicidas que maneja AgroMartín SL'
    ];

    for (const phrase of phrases) {
      console.log(`\n🧪 [GET CHEMICAL PRODUCTS BY CLIENT] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 12. GET FERTILIZERS - 5 frases representativas
  test('GetFertilizers', async ({ runAutoLoop }) => {
    const phrases = [
      'muéstrame los fertilizantes',
      'quiero ver la lista de fertilizantes',
      'lista de fertilizantes',
      'muéstrame los abonos que tengo registrados ahora mismo',
      'qué fertilizantes tengo actualmente en la finca'
    ];

    for (const phrase of phrases) {
      console.log(`\n🌿 [GET FERTILIZERS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 13. GET LAST PRICE - 5 frases representativas
  test('GetLastPrice', async ({ runAutoLoop }) => {
    const phrases = [
      'cuál es el último precio de Girasol?',
      'dime el precio más reciente del Girasol',
      'cuánto fue lo último que pagué por Girasol?',
      'cuál fue el último precio registrado del Girasol?',
      'dime el precio actualizado del Girasol'
    ];

    for (const phrase of phrases) {
      console.log(`\n📊 [GET LAST PRICE] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 14. GET MANUFACTURER PRODUCTS - 5 frases representativas
  test('GetManufacturerProducts', async ({ runAutoLoop }) => {
    const phrases = [
      'dime que fertilizantes tiene Mosaic Company',
      'que clasificación de fertilizantes tiene Mosaic Company?',
      'que productos de D-Coder tiene Mosaic Company?',
      'cuántos fertilizantes tiene Mosaic Company',
      'muéstrame la clasificación de productos químicos de Mosaic Company'
    ];

    for (const phrase of phrases) {
      console.log(`\n🏭 [GET MANUFACTURER PRODUCTS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 15. GET PLANNED CAMPAIGNS HISTORY - 5 frases representativas
  test('GetPlannedCampaignsHistory', async ({ runAutoLoop }) => {
    const phrases = [
      'muéstrame el historial de campañas de la granja prueba',
      'muestra el historial de campañas de la granja prueba',
      'muestra el historial de campañas de la granja prueba para el campo campo',
      'quiero ver el historial de campañas de AgroMartín SL en la granja prueba',
      'dame el historial del campo campo en la granja prueba'
    ];

    for (const phrase of phrases) {
      console.log(`\n📈 [GET PLANNED CAMPAIGNS HISTORY] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 16. GET PRICE VARIATION - 5 frases representativas
  test('GetPriceVariation', async ({ runAutoLoop }) => {
    const phrases = [
      'cuál ha sido la variación del precio del Girasol?',
      'dime cuánto ha variado el precio del Girasol',
      'qué tanta variación ha tenido el producto Girasol?',
      'quiero saber si el precio del Girasol ha subido o bajado',
      'cuánto ha cambiado el valor del Girasol en los últimos años?'
    ];

    for (const phrase of phrases) {
      console.log(`\n� [GET PRICE VARIATION] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 17. GET SEEDS NEEDED - 5 frases reales
  test('GetSeedsNeeded', async ({ runAutoLoop }) => {
    const phrases = [
      'Hola Luca, ¿cuántos kilos de semillas necesito?',
      '¿Qué cantidad de semillas se necesita para esta campaña?',
      'Luca, dime cuántos kg de semillas hacen falta por cultivo',
      '¿Cuánta semilla debo usar para cada cultivo?',
      '¿Qué dosis debo aplicar para cada variedad?'
    ];

    for (const phrase of phrases) {
      console.log(`\n🌱 [GET SEEDS NEEDED] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 18. GOODBYE - 3 frases reales (no inventar)
  test('Goodbye', async ({ runAutoLoop }) => {
    const phrases = [
      'adiós',
      'chao',
      'hasta luego'
    ];

    for (const phrase of phrases) {
      console.log(`\n👋 [GOODBYE] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 19. GREET - 5 frases representativas
  test('Greet', async ({ runAutoLoop }) => {
    const phrases = [
      'hola',
      'buenos días',
      'hey',
      'buenas tardes',
      'hola Luca'
    ];

    for (const phrase of phrases) {
      console.log(`\n👋 [GREET] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 20. REPORT FINISHED WORK - 5 frases representativas
  test('ReportFinishedWork', async ({ runAutoLoop }) => {
    const phrases = [
      'quiero reportar un trabajo finalizado',
      'reportar trabajo terminado',
      'reportar horas trabajadas',
      'reportar el trabajo 64f1b2c3d4e5f6a7b8c9d0e0 con 6.5 horas',
      'reportar 64f1b2c3d4e5f6a7b8c9d0e0 y 6.5 horas'
    ];

    for (const phrase of phrases) {
      console.log(`\n📝 [REPORT FINISHED WORK] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 21. REQUEST OTP - 5 frases representativas
  test('RequestOtp', async ({ runAutoLoop }) => {
    const phrases = [
      'enviar otp',
      'necesito un código de verificación',
      'mándame el código',
      'quiero verificar mi número',
      'envíame un OTP'
    ];

    for (const phrase of phrases) {
      console.log(`\n🔐 [REQUEST OTP] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 22. SEARCH PRODUCTS - 5 frases representativas
  test('SearchProducts', async ({ runAutoLoop }) => {
    const phrases = [
      'busca Girasol',
      'quiero buscar productos que contengan Girasol',
      'encuentra Girasol',
      'hay algo de Girasol?',
      'qué tipos tengo registrados de Girasol?'
    ];

    for (const phrase of phrases) {
      console.log(`\n🔎 [SEARCH PRODUCTS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 23. SEARCH PRODUCTS CROPS - 5 frases representativas
  test('SearchProductsCrops', async ({ runAutoLoop }) => {
    const phrases = [
      'existe el cultivo Girasol registrado?',
      'muéstrame todas las plantaciones con el nombre Girasol',
      'quiero ver los cultivos que coincidan con Girasol',
      'me podrías decir si tengo alguna siembra llamada Girasol?',
      'listar los cultivos que contengan la palabra Girasol'
    ];

    for (const phrase of phrases) {
      console.log(`\n🌾 [SEARCH PRODUCTS CROPS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

  // 24. SEARCH PRODUCTS FERTILIZERS - 5 frases representativas
  test('SearchProductsFertilizers', async ({ runAutoLoop }) => {
    const phrases = [
      'busca Girasol',
      'quiero buscar productos que contengan Girasol',
      'encuentra Girasol',
      'busca el fertilizante Girasol',
      'necesito encontrar abono Girasol'
    ];

    for (const phrase of phrases) {
      console.log(`\n🌿 [SEARCH PRODUCTS FERTILIZERS] Probando: "${phrase}"`);
      const result = await runAutoLoop(phrase, { resetChat: true });
      console.log(`Resultado: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.reason}`);
    }
  });

});