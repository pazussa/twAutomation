// Test: Verificar que los patrones flexibles detectan las preguntas del bot

const patterns = [
  { name: 'Nombre de la variedad', pattern: /\b(nombre\s+de\s+la\s+variedad|variedad\s+del\s+cultivo)\b/i, variable: 'variety_name' },
  { name: 'Nombre del cultivo', pattern: /\b(nombre\s+del\s+cultivo|qué\s+cultivo)\b/i, variable: 'crop_name' },
  { name: 'Nombre del fabricante', pattern: /\b(nombre\s+del\s+fabricante|fabricante)\b/i, variable: 'manufacturer_name' },
  { name: 'Destino', pattern: /\b(destino\s+del\s+cultivo|destino)\b/i, variable: 'destination' },
  { name: 'Marca', pattern: /\b(marca\s+del\s+cultivo|marca)\b/i, variable: 'brand' },
];

const botMessages = [
  'Nombre de la variedad',
  'Nombre de la variedad:',
  'Nombre de la variedad.',
  'Por favor, indícame el nombre de la variedad',
  'Nombre del cultivo',
  'Nombre del cultivo:',
  'Nombre del cultivo.',
  '¿Cuál es el nombre del cultivo?',
  'Nombre del fabricante',
  'Nombre del fabricante del producto que deseas registrar',
  'Nombre del fabricante del producto que deseas registrar.',
  'Fabricante',
  'Fabricante:',
  'Fabricante.',
  'Destino',
  'Destino del cultivo',
  'Destino.',
  'Marca',
  'Marca del cultivo',
  'Marca.',
  'Variedad del cultivo',
  'Variedad.',
];

console.log('=== TEST: PATRONES FLEXIBLES ===\n');

let matched = 0;
let unmatched = 0;

botMessages.forEach(msg => {
  let found = false;
  for (const p of patterns) {
    if (p.pattern.test(msg)) {
      console.log(`✅ "${msg}" → {${p.variable}}`);
      found = true;
      matched++;
      break;
    }
  }
  if (!found) {
    console.log(`❌ "${msg}" → SIN MATCH`);
    unmatched++;
  }
});

console.log(`\n📊 Resultado: ${matched}/${botMessages.length} mensajes detectados`);
if (unmatched > 0) {
  console.log(`⚠️ ${unmatched} mensajes sin detectar`);
} else {
  console.log(`✅ Todos los mensajes detectados correctamente`);
}
