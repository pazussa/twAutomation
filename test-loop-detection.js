// Test: Verificar detección de bucles infinitos

const MAX_SAME_RESPONSE = 5;

// Simular historial de respuestas
const scenarios = [
  {
    name: 'Bucle infinito detectado',
    sentHistory: ['NPK Completo', 'NPK Completo', 'NPK Completo', 'NPK Completo', 'NPK Completo', 'NPK Completo'],
    shouldDetect: true
  },
  {
    name: 'Respuestas variadas (no es bucle)',
    sentHistory: ['NPK Completo', 'trigo', 'Chamorro', 'pienso', 'GrainMaster'],
    shouldDetect: false
  },
  {
    name: 'Algunas repeticiones pero no suficientes',
    sentHistory: ['NPK Completo', 'NPK Completo', 'NPK Completo', 'trigo', 'Chamorro'],
    shouldDetect: false
  },
  {
    name: 'Exactamente 5 repeticiones',
    sentHistory: ['NPK Completo', 'NPK Completo', 'NPK Completo', 'NPK Completo', 'NPK Completo'],
    shouldDetect: true // Detecta cuando las últimas 5 son iguales
  },
  {
    name: 'Más de 5 repeticiones (con historial previo)',
    sentHistory: ['trigo', 'NPK Completo', 'NPK Completo', 'NPK Completo', 'NPK Completo', 'NPK Completo'],
    shouldDetect: true // Las últimas 5 son iguales
  },
  {
    name: 'Exactamente 4 repeticiones',
    sentHistory: ['NPK Completo', 'NPK Completo', 'NPK Completo', 'NPK Completo'],
    shouldDetect: false // Solo 4, no es suficiente
  }
];

console.log('=== TEST: DETECCIÓN DE BUCLES INFINITOS ===\n');

let passed = 0;
let failed = 0;

scenarios.forEach(scenario => {
  // Simular la lógica de detección
  const lastN = scenario.sentHistory.slice(-MAX_SAME_RESPONSE);
  const allSame = lastN.length === MAX_SAME_RESPONSE && lastN.every(msg => msg === lastN[0]);
  
  const detected = allSame;
  const success = detected === scenario.shouldDetect;
  
  if (success) {
    console.log(`✅ ${scenario.name}`);
    console.log(`   Historial: [${lastN.join(', ')}]`);
    console.log(`   Esperado: ${scenario.shouldDetect ? 'DETECTAR' : 'NO DETECTAR'} → Resultado: ${detected ? 'DETECTADO' : 'NO DETECTADO'}\n`);
    passed++;
  } else {
    console.log(`❌ ${scenario.name}`);
    console.log(`   Historial: [${lastN.join(', ')}]`);
    console.log(`   Esperado: ${scenario.shouldDetect ? 'DETECTAR' : 'NO DETECTAR'} → Resultado: ${detected ? 'DETECTADO' : 'NO DETECTADO'}\n`);
    failed++;
  }
});

console.log(`📊 Resultado: ${passed}/${scenarios.length} tests pasados`);
if (failed > 0) {
  console.log(`⚠️ ${failed} tests fallaron`);
  process.exit(1);
} else {
  console.log('✅ Todos los tests pasaron');
}
