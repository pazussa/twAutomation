#!/usr/bin/env node
/**
 * Regenerar ejemplos desde YML files usando las variables de data.ts
 * para continuar desde un checkpoint específico.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Variables fijas para regenerar (tomadas de VAR_POOLS en data.ts)
// client_name solo tiene 'Automatización Clnt' - NO María García
const VAR_POOLS = {
  active_matter_name: ['diflufenican', 'glifosato', 'abamectina'],
  amount_harvested: ['8500', '7200', '9100'],
  applied_dose: ['180', '200', '150'],
  brand: ['Bayer', 'Syngenta', 'BASF'],
  chemical_product_name: ['fungicida epoxiconazol', 'herbicida glifosato', 'insecticida clorpirifos'],
  client: ['AgroMartín SL', 'AgroTalavera', 'Finca Los Olivos'],
  client_name: ['Automatización Clnt'],  // IMPORTANTE: Solo este valor
  composition: ['consumo humano', 'pienso animal', 'uso industrial'],
  crop_name: ['cebada', 'trigo blando', 'girasol', 'maíz', 'avena'],
  depth: ['25', '30', '20'],
  destination: ['consumo', 'pienso', 'industrial'],
  farm_name: ['prueba', 'finca norte', 'campo sur'],
  fertilizer_name: ['Nitrofoska', 'Urea 46%', 'NPK 15-15-15'],
  field_name: ['campo', 'parcela A', 'lote 3'],
  form_type: ['líquido', 'granulado', 'polvo'],
  fuel_used: ['45.5', '38.2', '52.7'],
  general_dose: ['300', '250', '350'],
  manufacturer_name: ['Adama', 'Bayer CropScience', 'Helm AG'],
  mode_of_action: ['sistémico', 'contacto', 'traslocación'],
  nitrogen_level: ['20', '15', '25'],
  nombre_usuario_cliente: ['Automatización Clnt'],
  price: ['340', '285', '420'],
  product_name: ['Fungicida carbendazim', 'Herbicida glifosato', 'Insecticida clorpirifos'],
  search_query: ['Cebada'],
  target_pest: ['mildiu', 'roya', 'pulgón'],
  type_fertilizer: ['granulado', 'líquido', 'soluble'],
  type_work: ['SIEMBRA', 'COSECHA'],
  variety_name: ['rgt covadonga', 'n4h309 e', 'sin variedad'],
  work_id: ['64f1b2c3d4e5f6a7b8c9d0e0'],
  worked_hours: ['6.5', '7.2', '5.8'],
  price_date: ['hoy']
};

function readVarPools() {
  return VAR_POOLS;
}

// Materializar un template con variables
function materialize(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (key in vars) return vars[key];
    return `{${key}}`; // Mantener si no existe
  });
}

// Obtener valor aleatorio de pool
function getRandomFromPool(pools, poolName) {
  const pool = pools[poolName];
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

// Generar VARS desde pools
function generateVars(pools) {
  const vars = {};
  for (const key of Object.keys(pools)) {
    vars[key] = getRandomFromPool(pools, key);
  }
  return vars;
}

// Leer YML file y extraer ejemplos
function readYmlExamples(intentName) {
  // Buscar en test2 y test3
  const dirs = [
    path.join(ROOT, 'tests/test2'),
    path.join(ROOT, 'tests/test3')
  ];
  
  // Convertir camelCase a snake_case para el nombre del archivo
  const fileName = intentName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() + '.yml';
  
  for (const dir of dirs) {
    const filePath = path.join(dir, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = yaml.parse(content);
      
      // Estructura: nlu[0].examples es un string con formato "- ejemplo1\n- ejemplo2\n..."
      if (data.nlu && data.nlu[0] && data.nlu[0].examples) {
        const examplesStr = data.nlu[0].examples;
        // Parsear el string: cada línea que empieza con "- " es un ejemplo
        const examples = examplesStr
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.trim().substring(2).trim());
        return examples;
      }
      return [];
    }
  }
  
  console.warn(`⚠️ No se encontró YML para intent: ${intentName} (${fileName})`);
  return [];
}

// Intents que necesitamos regenerar (desde 672 en adelante)
const INTENTS_TO_REGENERATE = [
  'getMinPrice',
  'getPendingWorks', 
  'getPlannedCampaignsHistory',
  'getPriceVariation',
  'getSeedsNeeded',
  'goodbye',
  'greet',
  'reportFinishedWork',
  'searchProducts',
  'searchProductsCrops',
  'searchProductsFertilizers'
];

async function main() {
  console.log('🔄 Regenerando ejemplos desde YML con variables de data.ts...\n');
  
  // Leer VAR_POOLS
  const pools = readVarPools();
  console.log('✅ VAR_POOLS cargados:', Object.keys(pools).length, 'pools');
  console.log('   client_name:', pools.client_name);
  
  // Generar variables
  const vars = generateVars(pools);
  console.log('\n✅ Variables generadas:');
  console.log('   client_name:', vars.client_name);
  console.log('   crop_name:', vars.crop_name);
  console.log('   product_name:', vars.product_name);
  
  // Leer el temp-exec original para obtener los primeros 671 ejemplos
  const originalTempExec = JSON.parse(
    fs.readFileSync(path.join(ROOT, '.trash/1764163549198-temp-exec-496810a435e88506.json'), 'utf8')
  );
  
  // Tomar los primeros 671 ejemplos (ya procesados)
  const processedExamples = originalTempExec.examples.slice(0, 671);
  console.log(`\n✅ Manteniendo ${processedExamples.length} ejemplos ya procesados`);
  
  // Generar nuevos ejemplos para los intents restantes
  const newExamples = [];
  
  for (const intent of INTENTS_TO_REGENERATE) {
    const rawExamples = readYmlExamples(intent);
    console.log(`\n📝 ${intent}: ${rawExamples.length} ejemplos`);
    
    for (const rawExample of rawExamples) {
      // Materializar con las variables
      const example = materialize(rawExample, vars);
      newExamples.push({ intent, example });
      
      // Mostrar si había variable reemplazada
      if (rawExample !== example) {
        console.log(`   "${rawExample}" → "${example}"`);
      }
    }
  }
  
  console.log(`\n✅ ${newExamples.length} nuevos ejemplos generados`);
  
  // Verificar que no hay María García
  const mariaCount = newExamples.filter(e => e.example.includes('María García')).length;
  if (mariaCount > 0) {
    console.error(`\n❌ ERROR: Encontrados ${mariaCount} ejemplos con "María García"!`);
    process.exit(1);
  }
  console.log('✅ Verificado: No hay "María García" en los nuevos ejemplos');
  
  // Combinar: primeros 671 + nuevos
  const allExamples = [...processedExamples, ...newExamples];
  console.log(`\n📊 Total: ${allExamples.length} ejemplos (${processedExamples.length} procesados + ${newExamples.length} nuevos)`);
  
  // Escribir el nuevo temp-exec
  const tempExecPath = path.join(ROOT, 'temp-exec-496810a435e88506.json');
  fs.writeFileSync(tempExecPath, JSON.stringify({ examples: allExamples }, null, 2));
  console.log(`\n✅ Guardado en: ${tempExecPath}`);
  
  // Crear/actualizar checkpoint
  const checkpointPath = path.join(ROOT, 'checkpoint-496810a435e88506.json');
  const checkpoint = {
    totalProcessed: 671,
    currentIntent: 'getMinPrice',
    currentExampleIndex: 0,
    lastTimestamp: Date.now()
  };
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  console.log(`✅ Checkpoint actualizado: ${checkpointPath}`);
  
  // Restaurar conversación
  const convSrc = path.join(ROOT, '.trash/1764175455466-conversation-496810a435e88506.json');
  const convDst = path.join(ROOT, 'test-results/conversations/conversation-496810a435e88506.json');
  if (fs.existsSync(convSrc)) {
    fs.copyFileSync(convSrc, convDst);
    console.log(`✅ Conversación restaurada: ${convDst}`);
  }
  
  console.log('\n🎉 Listo! Puedes reanudar desde la UI admin (http://localhost:3000)');
}

main().catch(console.error);
