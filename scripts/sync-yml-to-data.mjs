#!/usr/bin/env node
/**
 * Sincroniza todos los archivos YML de test2/ y test3/ con data.ts
 * Genera intents, variables y archivos .spec.ts automáticamente
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TEST2_DIR = path.join(ROOT, 'tests/test2');
const TEST3_DIR = path.join(ROOT, 'tests/test3');
const DATA_TS = path.join(ROOT, 'tests/setup/data.ts');
const TESTS_DIR = path.join(ROOT, 'tests');

// Leer todos los YML de un directorio
function readYmlFiles(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'));
  const intents = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const parsed = parseYml(content, file);
    if (parsed) intents.push(parsed);
  }
  
  return intents;
}

// Parser simple de YML (enfocado en estructura Rasa)
function parseYml(content, filename) {
  const lines = content.split('\n');
  let intentName = null;
  let examples = [];
  let rawExamples = []; // Guardar ejemplos originales con anotaciones
  let inExamples = false;
  
  for (let line of lines) {
    // Detectar intent: get_min_price
    const intentMatch = line.match(/^-\s*intent:\s*(\w+)/);
    if (intentMatch) {
      intentName = intentMatch[1];
      continue;
    }
    
    // Detectar inicio de examples
    if (line.match(/^\s*examples:\s*\|/)) {
      inExamples = true;
      continue;
    }
    
    // Leer ejemplos (líneas que empiezan con -)
    if (inExamples && line.trim().startsWith('-')) {
      let rawExample = line.trim().substring(1).trim();
      rawExamples.push(rawExample); // Guardar original
      
      // Remover anotaciones de entidades [texto](entidad) y convertir a {variable}
      let example = rawExample.replace(/\[([^\]]+)\]\((\w+)\)/g, (match, text, entity) => {
        return `{${entity}}`;
      });
      
      if (example) examples.push(example);
    }
  }
  
  if (!intentName) {
    console.warn(`⚠️  No se encontró intent en ${filename}`);
    return null;
  }
  
  return { intentName, examples, rawExamples, filename };
}

// Extraer todas las variables únicas de los ejemplos
function extractVariables(allIntents) {
  const vars = new Set();
  
  for (const intent of allIntents) {
    for (const example of intent.examples) {
      const matches = example.matchAll(/\{(\w+)\}/g);
      for (const match of matches) {
        vars.add(match[1]);
      }
    }
  }
  
  return Array.from(vars).sort();
}

// Extraer valores anotados de los ejemplos YML: [texto](variable)
// Devuelve un mapa: { variable: [valor1, valor2, ...] }
function extractAnnotatedValues(allIntents) {
  const valuesByVar = {};
  
  for (const intent of allIntents) {
    for (const rawExample of intent.rawExamples || []) {
      // Buscar todas las anotaciones [texto](variable)
      const regex = /\[([^\]]+)\]\((\w+)\)/g;
      let match;
      while ((match = regex.exec(rawExample)) !== null) {
        const [, text, varName] = match;
        const trimmedText = text.trim();
        
        // Ignorar [hoy] - será manejado especialmente con fecha actual
        if (trimmedText.toLowerCase() === 'hoy') {
          // Marcar que esta variable necesita fecha actual
          if (!valuesByVar[varName]) {
            valuesByVar[varName] = [];
          }
          valuesByVar[varName].push('__TODAY__'); // Marcador especial
          continue;
        }
        
        if (!valuesByVar[varName]) {
          valuesByVar[varName] = [];
        }
        
        // Agregar valor si no existe ya
        if (trimmedText && !valuesByVar[varName].includes(trimmedText)) {
          valuesByVar[varName].push(trimmedText);
        }
      }
    }
  }
  
  return valuesByVar;
}

// Elegir el primer valor anotado, o un default genérico
function getDefaultValue(varName, annotatedValues) {
  // Si hay valores anotados
  if (annotatedValues[varName] && annotatedValues[varName].length > 0) {
    const firstValue = annotatedValues[varName][0];
    
    // Si el primer valor es __TODAY__, usar fecha actual
    if (firstValue === '__TODAY__') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    
    return firstValue;
  }
  
  // Si es price_date, usar fecha actual como fallback
  if (varName === 'price_date') {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // Defaults genéricos antiguos como fallback
  const genericDefaults = {
    active_matter_name: 'Glifosato',
    amount_harvested: '5000',
    applied_dose: '2.5',
    brand: 'GrainMaster',
    chemical_product_name: 'Herbicida Total',
    client: 'AgroTalavera',
    client_name: 'AgroTalavera',
    composition: '15-15-15',
    crop_name: 'trigo',
    depth: '30',
    destination: 'pienso',
    farm_name: 'Explotación Norte',
    fertilizer_name: 'NPK Completo',
    field_name: 'Campo 1',
    form_type: 'granulado',
    fuel_used: '45',
    general_dose: '200',
    manufacturer_name: 'AgroChemicals SA',
    mode_of_action: 'sistémico',
    nitrogen_level: '46',
    nombre_usuario_cliente: 'Juan Pérez',
    price: '250',
    product_name: 'Urea',
    search_query: 'fertilizante',
    target_pest: 'malas hierbas',
    type_fertilizer: 'nitrogenado',
    type_work: 'siembra',
    variety_name: 'Chamorro',
    work_id: 'WORK-12345',
    worked_hours: '8'
  };
  
  return genericDefaults[varName] || `valor_${varName}`;
}

// Convertir snake_case a camelCase
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convertir snake_case a PascalCase
function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// Generar el contenido de data.ts
function generateDataTs(allIntents, variables, annotatedValues) {
  const intentsCamelCase = allIntents.map(i => ({
    ...i,
    camelName: toCamelCase(i.intentName)
  }));
  
  let output = `import 'dotenv/config';
import type { Page } from 'playwright';

// Inlined helper functions (avoid ESM resolution issues when used outside Playwright runtime)
function materialize(template: string, vars: Record<string, string>): string {
  return template.replace(/\\{(\\w+)\\}/g, (_, k) => (k in vars ? vars[k] : \`{\${k}}\`));
}

function materializeAll(list: ReadonlyArray<string>, vars: Record<string, string>): string[] {
  return list.map(t => materialize(t, vars));
}

export const CFG = {
  contactName: process.env.CONTACT_NAME || 'Twilio',
  headless: (process.env.HEADLESS || 'false').toLowerCase() === 'true',
  sessionDir: (process.env.SESSION_DIR || '~/.wapp-autoloop-session').replace('~', process.env.HOME || ''),
  cmds: {
${intentsCamelCase.map(i => `    ${i.camelName}: process.env.CMD_${i.intentName.toUpperCase()} || '${toPascalCase(i.intentName)}'`).join(',\n')}
  }
} as const;

export const VARS: Record<string, string> = {
${variables.map(v => {
  const defaultValue = getDefaultValue(v, annotatedValues);
  return `  ${v}: process.env.VAR_${v.toUpperCase()} || '${defaultValue.replace(/'/g, "\\'")}',`;
}).join('\n')}
};

export const DEFAULT_VARS: Readonly<Record<string, string>> = { ...VARS };

export const setVar = (name: string, value: string) => {
  if (!name || !/^\\w+$/.test(name)) throw new Error(\`Nombre de variable inválido: "\${name}"\`);
  VARS[name] = String(value);
};

export const withVars = (vars: Record<string, string>) => {
  for (const [k, v] of Object.entries(vars)) setVar(k, String(v));
};

export function resetVarsToDefaults() {
  for (const [k, v] of Object.entries(DEFAULT_VARS)) {
    setVar(k, v);
  }
}

export const INTENTS_TEMPLATES = {
${intentsCamelCase.map(i => {
  const examplesStr = i.examples.map(ex => `    '${ex.replace(/'/g, "\\'")}'`).join(',\n');
  return `  ${i.camelName}: [\n${examplesStr}\n  ]`;
}).join(',\n')}
} as const;

export const INTENTS = Object.fromEntries(
  Object.entries(INTENTS_TEMPLATES).map(([k, arr]) => [k, materializeAll(arr, VARS)])
);

// Lista de cultivos disponibles para selección aleatoria
export const CROPS_POOL = [
  { crop_name: 'trigo', variety_name: 'Chamorro', destination: 'pienso', brand: 'GrainMaster' },
  { crop_name: 'maíz', variety_name: 'p 8660', destination: 'consumo', brand: 'SeedTech' },
  { crop_name: 'cebada', variety_name: 'Golden', destination: 'pienso', brand: 'HarvestPlus' },
  { crop_name: 'avena', variety_name: 'Premium', destination: 'consumo', brand: 'FarmSelect' },
  { crop_name: 'girasol', variety_name: 'Solaris', destination: 'aceite', brand: 'SunFields' },
  { crop_name: 'tomate', variety_name: 'Raf', destination: 'consumo', brand: 'VeggieTop' }
];

export function randomCrop(): typeof CROPS_POOL[number] {
  return CROPS_POOL[Math.floor(Math.random() * CROPS_POOL.length)];
}

export const KEYWORD_RULES: Array<{
  pattern: RegExp;
  action: { type: 'REPLY'; reply: string } | { type: 'END_OK' } | { type: 'END_ERR' } | { type: 'RETRY_EXISTS' };
  note: string;
  priority?: number;
}> = [
  // Opciones - se procesará con extractFirstOption en flow.ts
  { pattern: /opciones:/i, action: { type: 'REPLY', reply: '__EXTRACT_FIRST_OPTION__' }, note: 'Lista de opciones detectada', priority: 1 },
  
  // Ya existe
  { pattern: /ya\\s+exist/i, action: { type: 'RETRY_EXISTS' }, note: 'Elemento ya existe - reintentar', priority: 2 },
  
  // Finalizadores de éxito
  { pattern: /creado correctamente|registrado correctamente|guardado correctamente|planificado correctamente|asignado correctamente/i, action: { type: 'END_OK' }, note: 'Creación exitosa', priority: 3 },
  { pattern: /operación completada|proceso finalizado|todo listo|completado exitosamente/i, action: { type: 'END_OK' }, note: 'Operación exitosa', priority: 3 },
  { pattern: /reporte enviado|trabajo reportado/i, action: { type: 'END_OK' }, note: 'Reporte exitoso', priority: 3 },
  { pattern: /exito|exitoso|exitosa|exitosos|exitosas/i, action: { type: 'END_OK' }, note: 'Éxito detectado (cualquier variante)', priority: 3 },
  
  // Finalizadores de error
  { pattern: /error|fallo|problema|no se pudo|no se encontró|no existe|inválido/i, action: { type: 'END_ERR' }, note: 'Error detectado', priority: 3 },
  
  // Campos de Cultivo
  { pattern: /\\bnombre\\s+de\\s+la\\s+variedad/i, action: { type: 'REPLY', reply: '{variety_name}' }, note: 'Pide variedad', priority: 4 },
  { pattern: /\\bvariedad(\\s+del\\s+cultivo)?/i, action: { type: 'REPLY', reply: '{variety_name}' }, note: 'Pide variedad', priority: 4 },
  { pattern: /\\bnombre\\s+del\\s+cultivo/i, action: { type: 'REPLY', reply: '{crop_name}' }, note: 'Pide nombre cultivo', priority: 4 },
  { pattern: /\\bqu[ée]\\s+cultivo/i, action: { type: 'REPLY', reply: '{crop_name}' }, note: 'Pide qué cultivo', priority: 4 },
  { pattern: /\\bdestino(\\s+del\\s+cultivo)?/i, action: { type: 'REPLY', reply: '{destination}' }, note: 'Pide destino', priority: 4 },
  { pattern: /\\bmarca(\\s+del\\s+cultivo)?/i, action: { type: 'REPLY', reply: '{brand}' }, note: 'Pide marca', priority: 4 },
  
  // Campos de Cliente
  { pattern: /\\bnombre\\s+del\\s+cliente/i, action: { type: 'REPLY', reply: '{client}' }, note: 'Pide cliente', priority: 4 },
  { pattern: /\\bpara\\s+qu[ée]\\s+cliente/i, action: { type: 'REPLY', reply: '{client}' }, note: 'Pide cliente', priority: 4 },
  { pattern: /\\bcliente/i, action: { type: 'REPLY', reply: '{client}' }, note: 'Pide cliente', priority: 4 },
  { pattern: /\\bnombre\\s+de\\s+usuario\\s+del\\s+cliente/i, action: { type: 'REPLY', reply: '{nombre_usuario_cliente}' }, note: 'Pide usuario cliente', priority: 4 },
  { pattern: /\\busuario\\s+del\\s+cliente/i, action: { type: 'REPLY', reply: '{nombre_usuario_cliente}' }, note: 'Pide usuario cliente', priority: 4 },
  
  // Campos de Fertilizante
  { pattern: /\\bnombre\\s+del\\s+fertilizante/i, action: { type: 'REPLY', reply: '{fertilizer_name}' }, note: 'Pide fertilizante', priority: 4 },
  { pattern: /\\bfertilizante/i, action: { type: 'REPLY', reply: '{fertilizer_name}' }, note: 'Pide fertilizante', priority: 4 },
  { pattern: /\\btipo\\s+de\\s+fertilizante/i, action: { type: 'REPLY', reply: '{type_fertilizer}' }, note: 'Pide tipo fertilizante', priority: 4 },
  { pattern: /\\bcomposici[oó]n/i, action: { type: 'REPLY', reply: '{composition}' }, note: 'Pide composición', priority: 4 },
  { pattern: /\\bforma(\\s+del\\s+fertilizante)?/i, action: { type: 'REPLY', reply: '{form_type}' }, note: 'Pide forma', priority: 4 },
  { pattern: /\\bnivel\\s+de\\s+nitr[oó]geno/i, action: { type: 'REPLY', reply: '{nitrogen_level}' }, note: 'Pide nitrógeno', priority: 4 },
  
  // Campos de Producto Químico
  { pattern: /\\bnombre\\s+del\\s+fabricante/i, action: { type: 'REPLY', reply: '{manufacturer_name}' }, note: 'Pide fabricante', priority: 4 },
  { pattern: /\\bfabricante/i, action: { type: 'REPLY', reply: '{manufacturer_name}' }, note: 'Pide fabricante', priority: 4 },
  { pattern: /\\bnombre\\s+del\\s+producto\\s+qu[ií]mico/i, action: { type: 'REPLY', reply: '{chemical_product_name}' }, note: 'Pide producto químico', priority: 4 },
  { pattern: /\\bproducto\\s+qu[ií]mico/i, action: { type: 'REPLY', reply: '{chemical_product_name}' }, note: 'Pide producto químico', priority: 4 },
  { pattern: /\\bmateria\\s+activa/i, action: { type: 'REPLY', reply: '{active_matter_name}' }, note: 'Pide materia activa', priority: 4 },
  { pattern: /\\bprincipio\\s+activo/i, action: { type: 'REPLY', reply: '{active_matter_name}' }, note: 'Pide principio activo', priority: 4 },
  { pattern: /\\bplaga\\s+objetivo/i, action: { type: 'REPLY', reply: '{target_pest}' }, note: 'Pide plaga objetivo', priority: 4 },
  { pattern: /\\bplaga/i, action: { type: 'REPLY', reply: '{target_pest}' }, note: 'Pide plaga', priority: 4 },
  { pattern: /\\bmodo\\s+de\\s+acci[oó]n/i, action: { type: 'REPLY', reply: '{mode_of_action}' }, note: 'Pide modo acción', priority: 4 },
  
  // Campos de Granja/Campo
  { pattern: /\\bnombre\\s+de\\s+la\\s+granja/i, action: { type: 'REPLY', reply: '{farm_name}' }, note: 'Pide granja', priority: 4 },
  { pattern: /\\bgranja/i, action: { type: 'REPLY', reply: '{farm_name}' }, note: 'Pide granja', priority: 4 },
  { pattern: /\\bexplotaci[oó]n/i, action: { type: 'REPLY', reply: '{farm_name}' }, note: 'Pide explotación', priority: 4 },
  { pattern: /\\bqu[ée]\\s+granja/i, action: { type: 'REPLY', reply: '{farm_name}' }, note: 'Pide qué granja', priority: 4 },
  { pattern: /\\bnombre\\s+del\\s+campo/i, action: { type: 'REPLY', reply: '{field_name}' }, note: 'Pide campo', priority: 4 },
  { pattern: /\\bcampo/i, action: { type: 'REPLY', reply: '{field_name}' }, note: 'Pide campo', priority: 4 },
  { pattern: /\\bparcela/i, action: { type: 'REPLY', reply: '{field_name}' }, note: 'Pide parcela', priority: 4 },
  { pattern: /\\bqu[ée]\\s+campo/i, action: { type: 'REPLY', reply: '{field_name}' }, note: 'Pide qué campo', priority: 4 },
  
  // Campos de Trabajo
  { pattern: /\\btipo\\s+de\\s+trabajo/i, action: { type: 'REPLY', reply: '{type_work}' }, note: 'Pide tipo trabajo', priority: 4 },
  { pattern: /\\bID\\s+del\\s+trabajo/i, action: { type: 'REPLY', reply: '{work_id}' }, note: 'Pide ID trabajo', priority: 4 },
  { pattern: /\\bhoras\\s+trabajadas/i, action: { type: 'REPLY', reply: '{worked_hours}' }, note: 'Pide horas', priority: 4 },
  { pattern: /\\bdosis\\s+aplicada/i, action: { type: 'REPLY', reply: '{applied_dose}' }, note: 'Pide dosis aplicada', priority: 4 },
  { pattern: /\\bdosis\\s+general/i, action: { type: 'REPLY', reply: '{general_dose}' }, note: 'Pide dosis general', priority: 4 },
  { pattern: /\\bcantidad\\s+cosechada/i, action: { type: 'REPLY', reply: '{amount_harvested}' }, note: 'Pide cantidad cosechada', priority: 4 },
  { pattern: /^Profundidad\\.?$/i, action: { type: 'REPLY', reply: '{depth}' }, note: 'Pide profundidad', priority: 4 },
  { pattern: /^Combustible usado\\.?$/i, action: { type: 'REPLY', reply: '{fuel_used}' }, note: 'Pide combustible', priority: 4 },
  
  // Campos de Precio
  { pattern: /^Precio\\.?$/i, action: { type: 'REPLY', reply: '{price}' }, note: 'Pide precio', priority: 4 },
  { pattern: /^Fecha del precio\\.?$/i, action: { type: 'REPLY', reply: '{price_date}' }, note: 'Pide fecha precio', priority: 4 },
  { pattern: /^Nombre del producto\\.?$/i, action: { type: 'REPLY', reply: '{product_name}' }, note: 'Pide nombre producto', priority: 4 },
  
  // Búsquedas
  { pattern: /^Búsqueda\\.?$/i, action: { type: 'REPLY', reply: '{search_query}' }, note: 'Pide búsqueda', priority: 4 },
  { pattern: /^¿Qué producto buscar\\??$/i, action: { type: 'REPLY', reply: '{search_query}' }, note: 'Pide producto búsqueda', priority: 4 },
];

export type ActionResult = 
  | { type: 'REPLY'; message: string; rawResponse: string; materializedReply: string }
  | { type: 'END_OK'; message: string; rawResponse: string }
  | { type: 'END_ERR'; message: string; rawResponse: string }
  | { type: 'RETRY_EXISTS'; message: string; rawResponse: string }
  | { type: 'UNKNOWN'; message: string; rawResponse: string };

export async function detectAction(messages: string[], currentVars: Record<string, string>): Promise<ActionResult> {
  if (!messages || messages.length === 0) {
    return { type: 'UNKNOWN', message: 'No se recibieron mensajes', rawResponse: '' };
  }

  const fullResponse = messages.join('\\n');
  const sorted = [...KEYWORD_RULES].sort((a, b) => (a.priority || 99) - (b.priority || 99));

  for (const rule of sorted) {
    if (rule.pattern.test(fullResponse)) {
      if (rule.action.type === 'REPLY') {
        let replyText = rule.action.reply;
        
        // Si es __EXTRACT_FIRST_OPTION__, extraer el texto de la primera opción
        if (replyText === '__EXTRACT_FIRST_OPTION__') {
          const extracted = extractFirstOption(fullResponse);
          if (extracted) {
            replyText = extracted;
          } else {
            // Fallback: si no se puede extraer, enviar "1"
            replyText = '1';
          }
        }
        
        const materializedReply = materialize(replyText, currentVars);
        return {
          type: 'REPLY',
          message: \`Regla: \${rule.note} → responder "\${materializedReply}"\`,
          rawResponse: fullResponse,
          materializedReply
        };
      } else {
        return { type: rule.action.type, message: rule.note, rawResponse: fullResponse };
      }
    }
  }

  return { type: 'UNKNOWN', message: 'No se encontró regla aplicable', rawResponse: fullResponse };
}

// Funciones auxiliares para flow.ts
export function pickRandomCrop(): typeof CROPS_POOL[number] {
  return randomCrop();
}

const CLIENTS_POOL = ['AgroTalavera', 'Finca Los Olivos', 'Agrícola San José', 'El Cortijo', 'La Dehesa'];

export function pickRandomClient(): string {
  return CLIENTS_POOL[Math.floor(Math.random() * CLIENTS_POOL.length)];
}

export function mutateOneVariableForRetry() {
  // Mutar marca para evitar duplicados "ya existe"
  const currentBrand = VARS.brand || DEFAULT_VARS.brand || 'Brand';
  const suffix = Math.random().toString(36).substring(2, 6);
  setVar('brand', \`\${currentBrand}_\${suffix}\`);
}

export function extractFirstOption(text: string): string | null {
  // Buscar patrón "Opciones: opcion1, opcion2, opcion3"
  const match = text.match(/opciones:\\s*([^,]+)/i);
  if (match) {
    return match[1].trim();
  }
  // Fallback: buscar patrones numerados como "1) Opción" o "1. Opción"
  const numberedMatch = text.match(/^\\s*1[\\)\\.:]?\\s*(.+)$/m);
  return numberedMatch ? numberedMatch[1].trim() : null;
}
`;
  
  return output;
}

// Generar archivo .spec.ts para un intent
function generateSpecTs(intent) {
  const camelName = toCamelCase(intent.intentName);
  const pascalName = toPascalCase(intent.intentName);
  
  return `import { test, expect } from './_setup';

test('${pascalName} - Todos los intents', async ({ runAutoLoop, intents, conversation }) => {
  const fails: string[] = [];
  const list = intents.${camelName};
  
  for (let i = 0; i < list.length; i++) {
    const starter = list[i];
    conversation.logIntent(\`[\${i + 1}/\${list.length}] \${starter}\`, i + 1, list.length);
    
    const result = await runAutoLoop(starter, { resetChat: true });
    if (!result.success) {
      fails.push(\`Intent "\${starter}" falló: \${result.reason}\`);
    }
  }
  
  expect.soft(fails, fails.join('\\\\n')).toHaveLength(0);
});
`;
}

// Main
console.log('🔄 Sincronizando YML → data.ts + .spec.ts\n');

// Leer todos los YML
console.log('📖 Leyendo archivos YML...');
const test2Intents = readYmlFiles(TEST2_DIR);
const test3Intents = readYmlFiles(TEST3_DIR);
const allIntents = [...test2Intents, ...test3Intents];

console.log(`   ✅ test2/: ${test2Intents.length} intents`);
console.log(`   ✅ test3/: ${test3Intents.length} intents`);
console.log(`   📊 Total: ${allIntents.length} intents\n`);

// Extraer variables
console.log('🔍 Extrayendo variables...');
const variables = extractVariables(allIntents);
console.log(`   ✅ ${variables.length} variables únicas: ${variables.join(', ')}\n`);

// Extraer valores anotados de los YML
console.log('📋 Extrayendo valores anotados...');
const annotatedValues = extractAnnotatedValues(allIntents);
const annotatedCount = Object.keys(annotatedValues).length;
console.log(`   ✅ ${annotatedCount} variables con valores anotados`);
for (const [varName, values] of Object.entries(annotatedValues)) {
  if (values.length > 0) {
    console.log(`      ${varName}: ${values.slice(0, 3).join(', ')}${values.length > 3 ? '...' : ''}`);
  }
}
console.log();

// Generar data.ts
console.log('📝 Generando data.ts...');
const dataContent = generateDataTs(allIntents, variables, annotatedValues);
fs.writeFileSync(DATA_TS, dataContent, 'utf-8');
console.log(`   ✅ ${DATA_TS}\n`);

// Generar .spec.ts
console.log('📝 Generando archivos .spec.ts...');
for (const intent of allIntents) {
  const camelName = toCamelCase(intent.intentName);
  const specFile = path.join(TESTS_DIR, `${intent.intentName}.spec.ts`);
  const specContent = generateSpecTs(intent);
  fs.writeFileSync(specFile, specContent, 'utf-8');
  console.log(`   ✅ ${intent.intentName}.spec.ts`);
}

console.log(`\n✅ Sincronización completa!`);
console.log(`   📦 ${allIntents.length} intents sincronizados`);
console.log(`   🔤 ${variables.length} variables extraídas`);
console.log(`   📄 ${allIntents.length + 1} archivos generados\n`);
