import { test, expect } from './_setup';

// Deshabilita el riesgo de timeout del test: permite que termine todos los intents
test.setTimeout(24 * 60 * 60 * 1000); // 24 horas

test('Crear cultivo - Todos los intents', async ({ runAutoLoop, intents, conversation }) => {
  console.log('Iniciando test de crear cultivo con TODOS los intents: ', intents.crearCultivo);
  const fails: string[] = [];
  const list = intents.crearCultivo;
  console.log(`Total de intents a probar: ${list.length}`);

  for (let i = 0; i < list.length; i++) {
    const starter = list[i];
    console.log(`\n====== Intent ${i + 1}/${list.length}: "${starter}" ======`);
    conversation.logIntent(`[${i + 1}/${list.length}] ${starter}`, i + 1, list.length);

    const result = await runAutoLoop(starter, { resetChat: true }); // 1 vez por intent
  console.log('Resultado:', result);
    
    if (!result.success) {
      fails.push(`Intent "${starter}" falló: ${result.reason}`);
    }
  }

  // Evalúa al final para NO cortar la ejecución de intents intermedios
  console.log(`Completado: ${list.length - fails.length}/${list.length} intents exitosos`);
  if (fails.length > 0) {
  console.log('Fallos:', fails);
  }
  expect.soft(fails, fails.join('\n')).toHaveLength(0);
});
