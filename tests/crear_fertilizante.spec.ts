import { test, expect } from './_setup';

test('Crear fertilizante - Todos los intents', async ({ runAutoLoop, intents, conversation }) => {
  console.log('Iniciando test de crear fertilizante');
  const fails: string[] = [];
  const list = intents.crearFertilizante;
  console.log(`Total de intents a probar: ${list.length}`);

  for (let i = 0; i < list.length; i++) {
    const starter = list[i];
    console.log(`\n====== Intent ${i + 1}/${list.length}: "${starter}" ======`);
    conversation.logIntent(`[${i + 1}/${list.length}] ${starter}`, i + 1, list.length);

    const result = await runAutoLoop(starter, { resetChat: true });
  console.log('Resultado:', result);
    
    if (!result.success) {
      fails.push(`Intent "${starter}" falló: ${result.reason}`);
    }
  }

  console.log(`Completado: ${list.length - fails.length}/${list.length} intents exitosos`);
  if (fails.length > 0) {
  console.log('Fallos:', fails);
  }
  expect.soft(fails, fails.join('\n')).toHaveLength(0);
});
