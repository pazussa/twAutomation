import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs/promises';
import { statSync } from 'fs';

// ESM dirname emulation early so later helpers can use it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Import using explicit .ts so ts-node ESM can resolve the source file
// We'll lazy import the data module to avoid ESM resolution issues with ts-node.
let INTENTS_TEMPLATES: any; let INTENTS: any; let VARS: any; let KEYWORD_RULES: any; let setVar: any; let withVars: any; let DEFAULT_VARS: any; let VAR_POOLS: any;
async function loadDataModule() {
  if (!INTENTS_TEMPLATES) {
    // Resolve to .ts when running via ts-node/tsx, or .js when running compiled
    const baseRel = '../../tests/setup/data';
    const tsPath = path.resolve(__dirname, baseRel + '.ts');
    const jsPath = path.resolve(__dirname, baseRel + '.js');
    let resolvedFile: string;
    try {
      await fs.access(tsPath);
      resolvedFile = tsPath;
    } catch {
      await fs.access(jsPath); // will throw if not exists
      resolvedFile = jsPath;
    }
    const mod = await import(pathToFileURL(resolvedFile).href);
    INTENTS_TEMPLATES = mod.INTENTS_TEMPLATES;
    INTENTS = mod.INTENTS;
    VARS = mod.VARS;
    KEYWORD_RULES = mod.KEYWORD_RULES;
    setVar = mod.setVar;
    withVars = mod.withVars;
    DEFAULT_VARS = mod.DEFAULT_VARS;
    // VAR_POOLS is internal and not exported, so we need to parse the file to get it
    // For now, we'll read and parse the data.ts file to extract VAR_POOLS
    try {
      const dataContent = await fs.readFile(resolvedFile.replace('.js', '.ts'), 'utf8');
      const poolsMatch = dataContent.match(/const VAR_POOLS\s*=\s*({[\s\S]*?});/);
      if (poolsMatch) {
        // Parse the object using eval (safe since it's our own code)
        VAR_POOLS = eval('(' + poolsMatch[1] + ')');
      } else {
        VAR_POOLS = {};
      }
    } catch (e) {
      console.warn('[loadDataModule] No se pudo cargar VAR_POOLS:', e);
      VAR_POOLS = {};
    }
  }
}

// ---------- Persistence helpers (simple text patching) ----------
const DATA_FILE = path.resolve(__dirname, '../../tests/setup/data.ts');

async function readDataFile(): Promise<string> {
  return fs.readFile(DATA_FILE, 'utf8');
}

async function writeDataFile(source: string) {
  await fs.writeFile(DATA_FILE, source, 'utf8');
}

function sanitizeIdentifier(name: string) {
  if (!/^\w+$/.test(name)) throw new Error('Nombre inválido, solo letras/números/_');
  return name;
}

async function persistAddIntentCategory(name: string, examples: string[]) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  if ((INTENTS_TEMPLATES as any)[name]) throw new Error('El intent ya existe');
  const file = await readDataFile();
  const markerStart = 'export const INTENTS_TEMPLATES = {';
  const markerEnd = '} as const;';
  const startIdx = file.indexOf(markerStart);
  const endIdx = file.indexOf(markerEnd, startIdx);
  if (startIdx === -1 || endIdx === -1) throw new Error('No se encontró bloque INTENTS_TEMPLATES');
  const before = file.substring(0, endIdx);
  const after = file.substring(endIdx);
  const formatted = `  ${name}: [\n${examples.map(e => `    '${e.replace(/'/g, "\\'")}',`).join('\n')}\n  ],\n`;
  const updated = before + formatted + after;
  await writeDataFile(updated);
  // reflect in memory
  (INTENTS_TEMPLATES as any)[name] = examples;
}

async function persistAddIntentExample(name: string, example: string) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  const arr = (INTENTS_TEMPLATES as any)[name];
  if (!Array.isArray(arr)) throw new Error('Intent no existe');
  if (arr.includes(example)) return; // no duplicates
  const file = await readDataFile();
  // naive regex to locate array definition
  const intentRegex = new RegExp(`(${name}:\\s*\\[)([\\s\\S]*?)(\\n\\s*],)`, 'm');
  const match = file.match(intentRegex);
  if (!match) throw new Error('No se pudo localizar el intent en el archivo');
  const before = match[1];
  const body = match[2];
  const tail = match[3];
  const insertion = `${body}\n    '${example.replace(/'/g, "\\'")}',`;
  const replaced = file.replace(intentRegex, `${before}${insertion}${tail}`);
  await writeDataFile(replaced);
  arr.push(example);
}

async function persistAddRule(regex: string, action: { type: string; reply?: string }, note?: string, intents?: string[]) {
  await loadDataModule();
  const file = await readDataFile();
  const marker = 'export const KEYWORD_RULES:';
  const arrStart = file.indexOf(marker);
  if (arrStart === -1) throw new Error('No se encontró KEYWORD_RULES');
  const bracketIdx = file.indexOf('[', arrStart);
  const endIdx = file.indexOf('\n];', bracketIdx); // end of array line (pattern ) earlier uses ] alone? we search for \n];
  const insertionPoint = endIdx === -1 ? file.lastIndexOf('];') : endIdx;
  const ruleLineParts: string[] = [];
  const regEscaped = regex.replace(/\//g, '/');
  
  // Formatear intents para guardarlo (solo si no está vacío)
  const intentsStr = (intents && intents.length > 0) 
    ? `, intents: [${intents.map(i => `'${i.replace(/'/g, "\\'")}'`).join(', ')}]` 
    : '';
  
  if (action.type === 'REPLY') {
    // Regla especial: __EXTRACT_FIRST_OPTION__ debe tener prioridad 1
    const priority = (action.reply === '__EXTRACT_FIRST_OPTION__') ? 1 : 3;
    ruleLineParts.push(`  { pattern: /${regEscaped}/i, action: { type: 'REPLY', reply: '${(action.reply||'').replace(/'/g, "\\'")}' }, note: '${(note||'UI added').replace(/'/g, "\\'")}', priority: ${priority}${intentsStr} },`);
  } else if (action.type === 'END_OK' || action.type === 'END_ERR' || action.type === 'IGNORE') {
    ruleLineParts.push(`  { pattern: /${regEscaped}/i, action: { type: '${action.type}' }, note: '${(note||'UI added').replace(/'/g, "\\'")}', priority: 1${intentsStr} },`);
  } else {
    throw new Error('Acción no soportada para persistencia');
  }
  const updated = file.replace(/(export const KEYWORD_RULES:[\s\S]*?\n)];/, (m) => m.replace('\n];', '\n' + ruleLineParts.join('\n') + '\n];'));
  await writeDataFile(updated);
  // reflect in memory
  const pattern = new RegExp(regex, 'i');
  if (action.type === 'REPLY') {
    KEYWORD_RULES.push({ pattern, action: { type: 'REPLY', reply: action.reply }, note, intents });
  } else {
    KEYWORD_RULES.push({ pattern, action: { type: action.type }, note, intents });
  }
}

async function persistUpdateRule(idx: number, regex: string, action: { type: string; reply?: string }, note?: string, intents?: string[]) {
  await loadDataModule();
  if (idx < 0 || idx >= KEYWORD_RULES.length) throw new Error('Índice de regla inválido');
  
  const file = await readDataFile();
  const marker = 'export const KEYWORD_RULES:';
  const arrStart = file.indexOf(marker);
  if (arrStart === -1) throw new Error('No se encontró KEYWORD_RULES');
  
  // Find the specific rule line by counting rules
  const lines = file.split('\n');
  let ruleCount = 0;
  let targetLineIdx = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('{ pattern:') && line.includes('action:')) {
      if (ruleCount === idx) {
        targetLineIdx = i;
        break;
      }
      ruleCount++;
    }
  }
  
  if (targetLineIdx === -1) throw new Error('No se pudo localizar la regla a actualizar');
  
  // Build new rule line
  const regEscaped = regex.replace(/\//g, '/');
  
  // Formatear intents para guardarlo (solo si no está vacío)
  const intentsStr = (intents && intents.length > 0) 
    ? `, intents: [${intents.map(i => `'${i.replace(/'/g, "\\'")}'`).join(', ')}]` 
    : '';
  
  let newRuleLine: string;
  if (action.type === 'REPLY') {
    // Regla especial: __EXTRACT_FIRST_OPTION__ debe tener prioridad 1
    const priority = (action.reply === '__EXTRACT_FIRST_OPTION__') ? 1 : 3;
    newRuleLine = `  { pattern: /${regEscaped}/i, action: { type: 'REPLY', reply: '${(action.reply||'').replace(/'/g, "\\'")}' }, note: '${(note||'UI updated').replace(/'/g, "\\'")}', priority: ${priority}${intentsStr} },`;
  } else if (action.type === 'END_OK' || action.type === 'END_ERR' || action.type === 'IGNORE') {
    newRuleLine = `  { pattern: /${regEscaped}/i, action: { type: '${action.type}' }, note: '${(note||'UI updated').replace(/'/g, "\\'")}', priority: 1${intentsStr} },`;
  } else {
    throw new Error('Acción no soportada para persistencia');
  }
  
  // Replace the line
  lines[targetLineIdx] = newRuleLine;
  const updated = lines.join('\n');
  await writeDataFile(updated);
  
  // Update in memory
  const pattern = new RegExp(regex, 'i');
  if (action.type === 'REPLY') {
    KEYWORD_RULES[idx] = { pattern, action: { type: 'REPLY', reply: action.reply }, note, intents };
  } else {
    KEYWORD_RULES[idx] = { pattern, action: { type: action.type }, note, intents };
  }
}

async function persistDeleteRule(idx: number) {
  await loadDataModule();
  if (idx < 0 || idx >= KEYWORD_RULES.length) throw new Error('Índice de regla inválido');
  
  const file = await readDataFile();
  const marker = 'export const KEYWORD_RULES:';
  const arrStart = file.indexOf(marker);
  if (arrStart === -1) throw new Error('No se encontró KEYWORD_RULES');
  
  // Find the specific rule line by counting rules
  const lines = file.split('\n');
  let ruleCount = 0;
  let targetLineIdx = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('{ pattern:') && line.includes('action:')) {
      if (ruleCount === idx) {
        targetLineIdx = i;
        break;
      }
      ruleCount++;
    }
  }
  
  if (targetLineIdx === -1) throw new Error('No se pudo localizar la regla a eliminar');
  
  // Remove the line
  lines.splice(targetLineIdx, 1);
  const updated = lines.join('\n');
  await writeDataFile(updated);
  
  // Update in memory
  KEYWORD_RULES.splice(idx, 1);
}

async function persistAddVariable(name: string, value: string) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  if (Object.prototype.hasOwnProperty.call(VARS, name)) throw new Error('La variable ya existe');
  const file = await readDataFile();
  const marker = 'export const VARS: Record<string, string> = {';
  const startIdx = file.indexOf(marker);
  if (startIdx === -1) throw new Error('No se encontró bloque VARS');
  const closeIdx = file.indexOf('\n};', startIdx);
  const before = file.substring(0, closeIdx);
  const after = file.substring(closeIdx);
  const line = `  ${name}: '${value.replace(/'/g, "\\'")}',\n`;
  const updated = before + '\n' + line + after;
  await writeDataFile(updated);
  VARS[name] = value;
}

async function persistUpdateVariable(name: string, value: string) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  if (!Object.prototype.hasOwnProperty.call(VARS, name)) throw new Error('La variable no existe');
  const file = await readDataFile();
  
  // Buscar la línea de la variable con un patrón más flexible
  // El formato puede ser:
  // - name: 'valor',
  // - name: process.env.VAR_NAME || 'valor',
  const lines = file.split('\n');
  let lineIndex = -1;
  let indent = '  ';
  let hasComma = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Buscar línea que contenga el nombre de la variable seguido de :
    // Puede tener process.env o solo el valor directo
    const simpleMatch = line.match(new RegExp(`^(\\s*)(${name}):\\s*'.*'(,?)\\s*$`));
    const envMatch = line.match(new RegExp(`^(\\s*)(${name}):\\s*process\\.env\\.[A-Z_]+\\s*\\|\\|\\s*'.*'(,?)\\s*$`));
    
    if (simpleMatch) {
      lineIndex = i;
      indent = simpleMatch[1];
      hasComma = simpleMatch[3] === ',';
      break;
    } else if (envMatch) {
      lineIndex = i;
      indent = envMatch[1];
      hasComma = envMatch[3] === ',';
      break;
    }
  }
  
  if (lineIndex === -1) {
    throw new Error('No se pudo localizar la variable en el archivo');
  }
  
  // Reemplazar la línea completa
  const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  
  // Mantener el formato process.env si lo tenía, o usar el formato simple
  const originalLine = lines[lineIndex];
  if (originalLine.includes('process.env')) {
    // Mantener la estructura process.env
    const envVarName = originalLine.match(/process\.env\.([A-Z_]+)/)?.[1];
    if (envVarName) {
      lines[lineIndex] = `${indent}${name}: process.env.${envVarName} || '${escapedValue}'${hasComma ? ',' : ''}`;
    } else {
      // Fallback a formato simple
      lines[lineIndex] = `${indent}${name}: '${escapedValue}'${hasComma ? ',' : ''}`;
    }
  } else {
    // Formato simple
    lines[lineIndex] = `${indent}${name}: '${escapedValue}'${hasComma ? ',' : ''}`;
  }
  
  const updated = lines.join('\n');
  await writeDataFile(updated);
  VARS[name] = value;
}

async function persistDeleteVariable(name: string) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  if (!Object.prototype.hasOwnProperty.call(VARS, name)) throw new Error('La variable no existe');
  const file = await readDataFile();
  
  // Buscar y eliminar la línea de la variable
  const varPattern = new RegExp(`\\s*${name}:\\s*'[^']*',?\\n`, 'gm');
  const updated = file.replace(varPattern, '');
  
  await writeDataFile(updated);
  delete VARS[name];
}

async function persistDeleteIntent(name: string) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  const arr = (INTENTS_TEMPLATES as any)[name];
  if (!Array.isArray(arr)) throw new Error('Intent no existe');
  
  const file = await readDataFile();
  // Buscar y eliminar la definición completa del intent
  const intentRegex = new RegExp(`\\s*${name}:\\s*\\[[\\s\\S]*?\\],?\\n`, 'gm');
  const updated = file.replace(intentRegex, '');
  
  await writeDataFile(updated);
  delete (INTENTS_TEMPLATES as any)[name];
}

async function persistDeleteIntentExample(name: string, exampleIndex: number) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  const arr = (INTENTS_TEMPLATES as any)[name];
  if (!Array.isArray(arr)) throw new Error('Intent no existe');
  if (exampleIndex < 0 || exampleIndex >= arr.length) throw new Error('Índice de ejemplo inválido');
  
  const file = await readDataFile();
  const intentRegex = new RegExp(`(${name}:\\s*\\[)([\\s\\S]*?)(\\n\\s*],?)`, 'm');
  const match = file.match(intentRegex);
  if (!match) throw new Error('No se pudo localizar el intent en el archivo');
  
  // Dividir el contenido del array en líneas
  const before = match[1];
  const body = match[2];
  const tail = match[3];
  
  // Buscar las líneas que contienen los ejemplos
  const exampleLines = body.split('\n').filter(line => line.trim().startsWith("'"));
  
  if (exampleIndex >= exampleLines.length) {
    throw new Error('Índice de ejemplo inválido');
  }
  
  // Remover la línea del ejemplo
  exampleLines.splice(exampleIndex, 1);
  
  // Reconstruir el contenido
  const newBody = exampleLines.length > 0 
    ? '\n' + exampleLines.join('\n') + '\n  '
    : '\n  '; // Array vacío
  
  const replaced = file.replace(intentRegex, `${before}${newBody}${tail}`);
  await writeDataFile(replaced);
  
  // Actualizar en memoria
  arr.splice(exampleIndex, 1);
}

async function persistUpdateIntentExample(name: string, exampleIndex: number, newExample: string) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  const arr = (INTENTS_TEMPLATES as any)[name];
  if (!Array.isArray(arr)) throw new Error('Intent no existe');
  if (exampleIndex < 0 || exampleIndex >= arr.length) throw new Error('Índice de ejemplo inválido');
  
  const file = await readDataFile();
  const intentRegex = new RegExp(`(${name}:\\s*\\[)([\\s\\S]*?)(\\n\\s*],?)`, 'm');
  const match = file.match(intentRegex);
  if (!match) throw new Error('No se pudo localizar el intent en el archivo');
  
  // Dividir el contenido del array en líneas
  const before = match[1];
  const body = match[2];
  const tail = match[3];
  
  // Buscar las líneas que contienen los ejemplos
  const exampleLines = body.split('\n').filter(line => line.trim().startsWith("'"));
  
  if (exampleIndex >= exampleLines.length) {
    throw new Error('Índice de ejemplo inválido');
  }
  
  // Actualizar la línea del ejemplo
  exampleLines[exampleIndex] = `    '${newExample.replace(/'/g, "\\'")}',`;
  
  // Reconstruir el contenido
  const newBody = '\n' + exampleLines.join('\n') + '\n  ';
  
  const replaced = file.replace(intentRegex, `${before}${newBody}${tail}`);
  await writeDataFile(replaced);
  
  // Actualizar en memoria
  arr[exampleIndex] = newExample;
}

async function persistUpdateVarPool(name: string, values: string[]) {
  await loadDataModule();
  name = sanitizeIdentifier(name);
  
  if (!values || values.length === 0) {
    throw new Error('El pool debe tener al menos un valor');
  }
  
  const file = await readDataFile();
  
  // Buscar el bloque VAR_POOLS
  const poolsMatch = file.match(/const VAR_POOLS\s*=\s*{([\s\S]*?)};/);
  if (!poolsMatch) {
    throw new Error('No se encontró bloque VAR_POOLS');
  }
  
  const poolsContent = poolsMatch[1];
  const poolsStart = file.indexOf('const VAR_POOLS');
  const poolsEnd = file.indexOf('};', poolsStart) + 2;
  
  // Buscar la propiedad específica dentro del pool
  const propRegex = new RegExp(`(\\s*${name}:\\s*\\[)([\\s\\S]*?)(\\],?)`, 'm');
  const propMatch = poolsContent.match(propRegex);
  
  if (!propMatch) {
    throw new Error(`No se encontró el pool para la variable ${name}`);
  }
  
  // Construir el nuevo array de valores
  const newValuesStr = values.map(v => `'${v.replace(/'/g, "\\'")}'`).join(', ');
  const newPoolProp = `  ${name}: [\n    ${newValuesStr}\n  ],`;
  
  // Reemplazar en el contenido completo del archivo
  const beforePools = file.substring(0, poolsStart);
  const afterPools = file.substring(poolsEnd);
  
  // Reconstruir el contenido de VAR_POOLS con el pool actualizado
  const updatedPoolsContent = poolsContent.replace(propRegex, `\n${newPoolProp}\n`);
  const updatedPools = `const VAR_POOLS = {${updatedPoolsContent}};`;
  
  const updatedFile = beforePools + updatedPools + afterPools;
  await writeDataFile(updatedFile);
  
  // Actualizar en memoria
  if (VAR_POOLS) {
    VAR_POOLS[name] = values;
  }
}


const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to rebuild intents preview
function getState() {
  const state = {
    variables: { ...VARS },
    defaultVariables: { ...DEFAULT_VARS },
    variablePools: VAR_POOLS || {},
    // Enviar INTENTS_TEMPLATES (con {variables}) para el panel de edición
    intents: Object.entries(INTENTS_TEMPLATES as Record<string, string[]>).map(([k, arr]) => ({ name: k, examples: arr })),
    // Enviar INTENTS materializados para ejecución
    materializedIntents: INTENTS ? Object.entries(INTENTS as Record<string, string[]>).map(([k, arr]) => ({ name: k, examples: arr })) : [],
    rules: (KEYWORD_RULES as Array<{ pattern: RegExp; action: { type: string; reply?: string }; note?: string; intents?: string[] }>).map((r, idx) => ({ 
      idx: idx,
      pattern: r.pattern.toString(), 
      action: r.action, // Enviar el objeto completo { type, reply? }
      note: r.note || '',
      intents: r.intents || [] // Enviar array de intents (vacío = todos)
    }))
  };
  console.log(`[State] Enviando ${state.intents.length} intents (templates) y ${state.materializedIntents.length} intents (materializados)`);
  return state;
}

app.get('/api/state', async (_req, res) => {
  await loadDataModule();
  res.json(getState());
});

app.post('/api/variables', async (req, res) => {
  await loadDataModule();
  const body = req.body || {};
  const updated: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    try { setVar(k, String(v)); updated[k] = VARS[k]; } catch (e: any) { return res.status(400).json({ error: e.message }); }
  }
  res.json({ ok: true, updated });
});

app.post('/api/variables/new', async (req, res) => {
  try {
    const { name, value } = req.body || {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name requerido' });
    await persistAddVariable(name, String(value ?? ''));
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put('/api/variables/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const { value } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name requerido' });
    
    console.log(`[Update Variable] Actualizando variable "${name}" con valor:`, value);
    
    // Detectar si es un pool (array) o variable simple
    await loadDataModule();
    const isPool = Object.prototype.hasOwnProperty.call(VAR_POOLS, name);
    
    if (isPool) {
      // Si es un pool, actualizar el pool con un solo valor o array de valores
      const values = Array.isArray(value) ? value : [String(value ?? '')];
      await persistUpdateVarPool(name, values);
      console.log(`[Update Variable] Pool "${name}" actualizado exitosamente con ${values.length} valores`);
      res.json({ ok: true, name, values: VAR_POOLS[name], isPool: true });
    } else {
      // Variable simple
      await persistUpdateVariable(name, String(value ?? ''));
      console.log(`[Update Variable] Variable "${name}" actualizada exitosamente`);
      res.json({ ok: true, name, value: VARS[name], isPool: false });
    }
  } catch (e: any) { 
    console.error(`[Update Variable] Error:`, e.message);
    res.status(400).json({ error: e.message }); 
  }
});

app.delete('/api/variables/:name', async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) return res.status(400).json({ error: 'name requerido' });
    await persistDeleteVariable(name);
    res.json({ ok: true, deleted: name });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Endpoint para actualizar pools de variables
app.put('/api/variable-pools/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const { values } = req.body || {};
    
    if (!name) return res.status(400).json({ error: 'name requerido' });
    if (!Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: 'values debe ser un array con al menos un valor' });
    }
    
    console.log(`[Update Pool] Actualizando pool de "${name}" con ${values.length} valores`);
    await persistUpdateVarPool(name, values);
    console.log(`[Update Pool] Pool de "${name}" actualizado exitosamente`);
    
    res.json({ ok: true, name, count: values.length });
  } catch (e: any) {
    console.error(`[Update Pool] Error:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

// NOTE: Modifying intents/rules persistently would require file writes; here we accept ephemeral additions.
app.post('/api/intents/:name', async (req, res) => {
  await loadDataModule();
  const name = req.params.name;
  const { example } = req.body || {};
  if (!name || !example) return res.status(400).json({ error: 'name y example requeridos' });
  try {
    await persistAddIntentExample(name, String(example).trim());
    const target = (INTENTS_TEMPLATES as any)[name];
    res.json({ ok: true, intent: name, total: target.length });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/api/intents', async (req, res) => {
  const { name, examples } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name requerido' });
  const list: string[] = Array.isArray(examples)
    ? examples.map(String).filter(s => s.trim())
    : (typeof examples === 'string' ? examples.split('\n').map(s=>s.trim()).filter(Boolean) : []);
  if (list.length === 0) return res.status(400).json({ error: 'Se requiere al menos un ejemplo' });
  try {
    await persistAddIntentCategory(String(name), list);
    res.json({ ok: true, name, total: list.length });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/intents/:name', async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) return res.status(400).json({ error: 'name requerido' });
    console.log(`[Delete Intent API] Intentando eliminar intent: ${name}`);
    await persistDeleteIntent(name);
    console.log(`[Delete Intent API] Intent ${name} eliminado exitosamente`);
    res.json({ ok: true, deleted: name });
  } catch (e: any) { 
    console.error(`[Delete Intent API] Error:`, e.message);
    res.status(400).json({ error: e.message }); 
  }
});

app.delete('/api/intents/:name/examples/:idx', async (req, res) => {
  try {
    const name = req.params.name;
    const idx = parseInt(req.params.idx);
    if (!name) return res.status(400).json({ error: 'name requerido' });
    if (isNaN(idx)) return res.status(400).json({ error: 'Índice inválido' });
    
    console.log(`[Delete Example API] Eliminando ejemplo ${idx} de intent ${name}`);
    await persistDeleteIntentExample(name, idx);
    console.log(`[Delete Example API] Ejemplo eliminado exitosamente`);
    res.json({ ok: true, intent: name, deletedIndex: idx });
  } catch (e: any) { 
    console.error(`[Delete Example API] Error:`, e.message);
    res.status(400).json({ error: e.message }); 
  }
});

app.put('/api/intents/:name/examples/:idx', async (req, res) => {
  try {
    const name = req.params.name;
    const idx = parseInt(req.params.idx);
    const { example } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name requerido' });
    if (isNaN(idx)) return res.status(400).json({ error: 'Índice inválido' });
    if (!example) return res.status(400).json({ error: 'example requerido' });
    
    console.log(`[Update Example API] Actualizando ejemplo ${idx} de intent ${name}`);
    await persistUpdateIntentExample(name, idx, String(example).trim());
    console.log(`[Update Example API] Ejemplo actualizado exitosamente`);
    res.json({ ok: true, intent: name, updatedIndex: idx, example });
  } catch (e: any) { 
    console.error(`[Update Example API] Error:`, e.message);
    res.status(400).json({ error: e.message }); 
  }
});

app.post('/api/rules', async (req, res) => {
  await loadDataModule();
  const { regex, action, note, reply, intents } = req.body || {};
  if (!regex || !action) return res.status(400).json({ error: 'regex y action requeridos' });
  let pattern: RegExp;
  try { pattern = new RegExp(regex, 'i'); } catch { return res.status(400).json({ error: 'regex inválida' }); }
  
  // Normalizar action: puede venir como string o como objeto { type, reply }
  const actionType = typeof action === 'string' ? action : action.type;
  const actionReply = typeof action === 'object' && action.reply ? action.reply : reply;
  
  const act = (() => {
    if (actionType === 'END_OK') return { type: 'END_OK' } as const;
    if (actionType === 'END_ERR') return { type: 'END_ERR' } as const;
    if (actionType === 'IGNORE') return { type: 'IGNORE' } as const;
    if (actionType === 'REPLY') {
      if (!actionReply) return res.status(400).json({ error: 'reply requerido para action REPLY' });
      return { type: 'REPLY', reply: String(actionReply) } as const;
    }
    return null;
  })();
  if (!act) return res.status(400).json({ error: 'action inválida (permitidos: END_OK, END_ERR, IGNORE, REPLY)' });
  try {
    await persistAddRule(regex, act as any, note, intents);
    res.json({ ok: true, total: KEYWORD_RULES.length });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put('/api/rules/:idx', async (req, res) => {
  await loadDataModule();
  const idx = parseInt(req.params.idx);
  if (isNaN(idx)) return res.status(400).json({ error: 'Índice inválido' });
  
  const { regex, action, note, reply, intents } = req.body || {};
  if (!regex || !action) return res.status(400).json({ error: 'regex y action requeridos' });
  let pattern: RegExp;
  try { pattern = new RegExp(regex, 'i'); } catch { return res.status(400).json({ error: 'regex inválida' }); }
  
  // Normalizar action: puede venir como string o como objeto { type, reply }
  const actionType = typeof action === 'string' ? action : action.type;
  const actionReply = typeof action === 'object' && action.reply ? action.reply : reply;
  
  if (actionType === 'REPLY' && !actionReply) {
    return res.status(400).json({ error: 'reply requerido para action REPLY' });
  }
  const act = (() => {
    if (actionType === 'END_OK') return { type: 'END_OK' } as const;
    if (actionType === 'END_ERR') return { type: 'END_ERR' } as const;
    if (actionType === 'IGNORE') return { type: 'IGNORE' } as const;
    if (actionType === 'REPLY') return { type: 'REPLY', reply: String(actionReply) } as const;
    return null;
  })();
  if (!act) return res.status(400).json({ error: 'action inválida (permitidos: END_OK, END_ERR, IGNORE, REPLY)' });
  try {
    await persistUpdateRule(idx, regex, act as any, note, intents);
    res.json({ ok: true, total: KEYWORD_RULES.length });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/rules/:idx', async (req, res) => {
  await loadDataModule();
  const idx = parseInt(req.params.idx);
  if (isNaN(idx)) return res.status(400).json({ error: 'Índice inválido' });
  
  try {
    await persistDeleteRule(idx);
    res.json({ ok: true, total: KEYWORD_RULES.length });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ========== Execution endpoints ==========
import { spawn } from 'child_process';
import crypto from 'crypto';

let isExecuting = false;
let isPostProcessing = false; // Generando PDF después de la ejecución
let isPausing = false; // Evita pausas múltiples simultáneas
let currentExecutionId: string | null = null;
let child: any = null; // Referencia al proceso hijo para poder pausarlo

// Función para procesar archivos conversation-*.json pendientes y generar reportes
async function processOrphanedConversationFiles(forcedExecutionId?: string, keepFile: boolean = false): Promise<{processed: boolean, htmlPath?: string, eventCount?: number}> {
  const cwd = path.resolve(__dirname, '../..');
  let conversationFiles: string[] = [];
  
  try {
    const files = await fs.readdir(cwd);
    // Buscar archivos de conversación - ahora pueden ser:
    // - conversation-{executionId}.json (nuevo formato persistente)
    // - conversation-{timestamp}.json (formato legacy)
    conversationFiles = files.filter(f => f.startsWith('conversation-') && f.endsWith('.json'));
    
    // Si hay un executionId específico, priorizar ese archivo
    if (forcedExecutionId) {
      const specificFile = `conversation-${forcedExecutionId}.json`;
      if (conversationFiles.includes(specificFile)) {
        conversationFiles = [specificFile];
      }
    }
  } catch (e) {
    console.warn('[ProcessConversations] ⚠️ Error al buscar archivos:', e);
    return { processed: false };
  }
  
  if (conversationFiles.length === 0) {
    return { processed: false };
  }
  
  console.log(`[ProcessConversations] 📝 Procesando ${conversationFiles.length} archivos de conversación...`);
  
  // Determinar el executionId: usar el forzado, o extraerlo del nombre del archivo, o del temp-exec
  let executionId = forcedExecutionId;
  if (!executionId) {
    // Intentar extraer del nombre del archivo de conversación (nuevo formato)
    const execIdMatch = conversationFiles[0]?.match(/conversation-([a-f0-9]{16})\.json/);
    if (execIdMatch) {
      executionId = execIdMatch[1];
    }
  }
  if (!executionId) {
    try {
      const files = await fs.readdir(cwd);
      const tempFiles = files.filter(f => f.startsWith('temp-exec-'));
      if (tempFiles.length > 0) {
        executionId = tempFiles[0].replace('temp-exec-', '').replace('.json', '');
      }
    } catch {}
  }
  if (!executionId) {
    executionId = `orphan-${Date.now()}`;
  }
  
  try {
    // Leer todos los archivos de conversación y combinarlos
    const allEvents: any[] = [];
    for (const file of conversationFiles) {
      const filePath = path.join(cwd, file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        if (data.events && Array.isArray(data.events)) {
          allEvents.push(...data.events);
        }
      } catch (e) {
        console.warn(`[ProcessConversations] ⚠️ Error al leer ${file}:`, e);
        continue;
      }
      
      // SIEMPRE conservar archivos JSON de conversación
      console.log(`[ProcessConversations] 💾 Archivo conservado: ${file}`);
    }
    
    if (allEvents.length === 0) {
      console.log('[ProcessConversations] ⚠️ No hay eventos en los archivos');
      return { processed: false };
    }
    
    // Generar HTML
    const htmlPath = path.resolve(__dirname, `../../test-results/conversations/Ejecucion-${executionId}.html`);
    const htmlDir = path.dirname(htmlPath);
    await fs.mkdir(htmlDir, { recursive: true });
    
    const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Agrupar por intent
    const groups: Array<{ label: string; idx: number; total: number; events: any[] }> = [];
    let current: { label: string; idx: number; total: number; events: any[] } | null = null;
    
    for (const ev of allEvents) {
      if (ev.kind === 'intent') {
        if (current) groups.push(current);
        current = { 
          label: ev.text || `Intent ${groups.length + 1}`, 
          idx: ev.meta?.idx ?? groups.length + 1, 
          total: ev.meta?.total ?? allEvents.filter(e => e.kind === 'intent').length, 
          events: [] 
        };
        continue;
      }
      if (!current) {
        current = { label: `Intent 1`, idx: 1, total: 1, events: [] };
      }
      current.events.push(ev);
    }
    if (current) groups.push(current);
    
    const groupSummaries = groups.map(g => {
      const failed = g.events.some(e => e.ok === false);
      return { ...g, status: failed ? 'fail' : 'ok' };
    });
    
    const intentStats = groupSummaries.map(g => {
      const intentPhrases = g.events.filter(e => e.kind === 'send' || e.kind === 'recv');
      const intentPassed = intentPhrases.filter(e => e.ok).length;
      const intentTotal = intentPhrases.length;
      const intentSuccessRate = intentTotal > 0 ? ((intentPassed / intentTotal) * 100).toFixed(1) : '0.0';
      return { ...g, intentPassed, intentTotal, intentSuccessRate };
    });
    
    const totalIntents = groups.length;
    
    const groupsHtml = intentStats.map(g => {
      const rows = g.events.length
        ? g.events.map((ev: any, i: number) => {
            const colTime = new Date(ev.t).toLocaleTimeString('es-CO', { 
              timeZone: 'America/Bogota', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            });
            const tipo = ev.kind === 'send' ? 'Enviado' : ev.kind === 'recv' ? 'Recibido' : 'Intent';
            const badge = ev.ok ? '<span class="badge ok">OK</span>' : '<span class="badge fail">FAIL</span>';
            return `<tr data-timestamp="${ev.t}">
<td class="idx">${i + 1}</td>
<td class="tipo ${ev.kind}">${tipo}</td>
<td class="texto">${esc((ev.text || '').replace(/\s+/g, ' ').trim())}</td>
<td class="time">${colTime}</td>
<td class="estado">${badge}</td>
</tr>`;
          }).join('\n')
        : '<tr><td colspan="5" style="color:#64748b">Sin eventos en este intent</td></tr>';
      
      const chipClass = g.status === 'ok' ? 'ok' : 'fail';
      const chipText = g.status === 'ok' ? 'OK' : 'FAIL';
      
      return `<div class="intent-card">
<div class="intent-header">
  <div class="intent-title">${esc(g.label)} <span class="intent-sub">(${g.idx}/${g.total})</span></div>
  <div class="intent-stats">
    <span class="chip success-rate">Éxito: ${g.intentSuccessRate}% (${g.intentPassed}/${g.intentTotal})</span>
    <span class="chip ${chipClass}">${chipText}</span>
  </div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>Tipo</th><th>Texto</th><th>Hora</th><th>Resultado</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>`;
    }).join('\n');
    
    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Ejecución ${executionId} - INTERRUMPIDA</title>
<style>
:root {
  --ok: #10b981;
  --fail: #ef4444;
  --send: #1d4ed8;
  --recv: #6b7280;
  --bg: #f8fafc;
  --card: #ffffff;
  --border: #e5e7eb;
}
html,body{background:var(--bg);}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Arial,sans-serif;margin:24px;color:#0f172a;}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.05);padding:18px 20px;margin-bottom:18px;}
h1{font-size:20px;margin:0 0 4px;}
.meta{color:#475569;margin:0 0 12px;font-size:14px}
.summary{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0 0}
.chip{border:1px solid var(--border);border-radius:999px;padding:6px 10px;font-size:13px;background:#fff}
.chip.ok{border-color:var(--ok);color:var(--ok)}
.chip.fail{border-color:var(--fail);color:var(--fail)}
.chip.success-rate{border-color:#8b5cf6;color:#8b5cf6;background:rgba(139,92,246,.08)}
.chip.total-events{border-color:#0ea5e9;color:#0ea5e9;background:rgba(14,165,233,.08)}
table{width:100%;border-collapse:collapse;margin-top:6px;font-size:14px}
thead th{font-weight:600;text-align:left;color:#334155;border-bottom:1px solid var(--border);padding:8px}
tbody td{border-top:1px solid var(--border);padding:8px;vertical-align:top}
td.idx{width:44px;color:#64748b}
td.tipo.send{color:var(--send);font-weight:600}
td.tipo.recv{color:var(--recv);font-weight:600}
td.tipo.intent{color:#7c3aed;font-weight:700}
td.time{white-space:nowrap;color:#64748b}
td.texto{white-space:pre-wrap;word-wrap:break-word}
.badge{display:inline-block;border-radius:8px;padding:2px 8px;font-size:12px;border:1px solid}
.badge.ok{border-color:var(--ok);color:var(--ok);background:rgba(16,185,129,.08)}
.badge.fail{border-color:var(--fail);color:var(--fail);background:rgba(239,68,68,.08)}
.intent-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:14px 0}
.intent-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.intent-title{font-weight:700}
.intent-sub{color:#64748b;font-weight:500;margin-left:6px}
.intent-stats{display:flex;gap:8px;align-items:center}
.interrupt-notice{background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:12px 16px;margin-bottom:16px;}
.interrupt-notice h3{margin:0 0 4px;color:#92400e;font-size:15px;}
.interrupt-notice p{margin:0;color:#78350f;font-size:13px;}
</style>
</head>
<body>
<div class="interrupt-notice">
  <h3>⚠️ Ejecución Interrumpida</h3>
  <p>Esta ejecución fue interrumpida por el usuario. Los datos mostrados son parciales.</p>
</div>
<div class="card">
  <h1>Ejecución ${executionId} - Interrumpida</h1>
  <div class="meta">
    <div><strong>Estado:</strong> Interrumpida por el usuario</div>
    <div><strong>Eventos registrados:</strong> ${allEvents.length}</div>
  </div>
  <div class="summary">
    <div class="chip total-events">Total Intents: ${totalIntents}</div>
    <div class="chip ok">Intents OK: ${intentStats.filter(g => g.status === 'ok').length}</div>
    <div class="chip fail">Intents FAIL: ${intentStats.filter(g => g.status === 'fail').length}</div>
    <div class="chip success-rate">Éxito: ${totalIntents > 0 ? ((intentStats.filter(g => g.status === 'ok').length / totalIntents) * 100).toFixed(1) : '0.0'}%</div>
  </div>
</div>

<div class="card">
  <h2 style="margin:0 0 8px;font-size:16px">Conversación por intent</h2>
  ${groupsHtml}
</div>
</body>
</html>`;
    
    await fs.writeFile(htmlPath, html, 'utf8');
    console.log(`[ProcessConversations] ✅ HTML generado: Ejecucion-${executionId}.html (${allEvents.length} eventos, ${totalIntents} intents)`);
    
    return { processed: true, htmlPath, eventCount: allEvents.length };
  } catch (e) {
    console.error('[ProcessConversations] ❌ Error al generar HTML:', e);
    return { processed: false };
  }
}

// Endpoint para procesar manualmente archivos de conversación pendientes
app.post('/api/process-conversations', async (_req, res) => {
  console.log('[API] 📝 Solicitud manual para procesar conversaciones pendientes');
  const result = await processOrphanedConversationFiles();
  
  if (result.processed) {
    res.json({ 
      ok: true, 
      message: `Reporte generado con ${result.eventCount} eventos`,
      htmlPath: result.htmlPath
    });
  } else {
    res.json({ 
      ok: false, 
      message: 'No hay archivos de conversación pendientes' 
    });
  }
});

app.post('/api/execute', async (req, res) => {
  if (isExecuting) {
    return res.status(409).json({ error: 'Ya hay una ejecución en proceso' });
  }

  const { examples, resumeFromCheckpoint } = req.body || {};
  const cwd = path.resolve(__dirname, '../..');
  let executionId: string;
  let tempConfigPath: string | null = null;
  
  if (resumeFromCheckpoint) {
    // MODO REANUDACIÓN: Usar archivos existentes
    const files = await fs.readdir(cwd);
    const checkpointFiles = files.filter(f => f.startsWith('checkpoint-'));
    
    if (checkpointFiles.length === 0) {
      return res.status(404).json({ error: 'No hay checkpoint para reanudar' });
    }
    
    // Buscar el temp-exec correspondiente
    const tempFiles = files.filter(f => f.startsWith('temp-exec-'));
    if (tempFiles.length === 0) {
      return res.status(404).json({ error: 'No se encontró configuración de ejecución anterior' });
    }
    
    // Extraer el execution ID del archivo temp-exec
    const tempFile = tempFiles[0];
    executionId = tempFile.replace('temp-exec-', '').replace('.json', '');
    tempConfigPath = path.join(cwd, tempFile);
    
    console.log(`[Execution] 🔄 Reanudando ejecución ${executionId} desde checkpoint`);
  } else {
    // MODO NUEVA EJECUCIÓN: Limpiar archivos anteriores y crear nuevos
    if (!Array.isArray(examples) || examples.length === 0) {
      return res.status(400).json({ error: 'Se requiere array de ejemplos' });
    }
    
    // Mover archivos temp-exec y checkpoint anteriores a papelera en lugar de eliminar
    console.log('[Execution] 🗑️  Moviendo checkpoints anteriores a papelera...');
    const files = await fs.readdir(cwd);
    
    // Crear carpeta papelera si no existe
    const trashDir = path.join(cwd, '.trash');
    await fs.mkdir(trashDir, { recursive: true });
    
    // Conservar archivos conversation-*.json (nunca borrar)
    const pendingConversations = files.filter(f => f.startsWith('conversation-') && f.endsWith('.json'));
    if (pendingConversations.length > 0) {
      console.log(`[Execution] 💾 Conservando ${pendingConversations.length} archivos de conversación existentes`);
    }
    
    const oldFiles = files.filter(f => f.startsWith('temp-exec-') || f.startsWith('checkpoint-'));
    for (const file of oldFiles) {
      try {
        const sourcePath = path.join(cwd, file);
        const destPath = path.join(trashDir, `${Date.now()}-${file}`);
        await fs.rename(sourcePath, destPath);
        console.log(`[Execution] ✓ Movido a papelera: ${file}`);
      } catch (e) {
        console.warn(`[Execution] ⚠️  No se pudo mover ${file}:`, e);
      }
    }
    
    // Generar nuevo execution ID
    executionId = crypto.randomBytes(8).toString('hex');
    tempConfigPath = path.resolve(__dirname, `../../temp-exec-${executionId}.json`);
    
    try {
      await fs.writeFile(tempConfigPath, JSON.stringify({ examples }, null, 2), 'utf8');
      console.log(`[Execution] 🆕 Nueva ejecución ${executionId} con ${examples.length} ejemplos`);
    } catch (e: any) {
      return res.status(500).json({ error: `Error escribiendo config temporal: ${e.message}` });
    }
  }

  currentExecutionId = executionId;

  // Respond immediately
  res.json({ 
    ok: true, 
    executionId, 
    examples: resumeFromCheckpoint ? 'Reanudando desde checkpoint' : examples.length 
  });

  // Limpiar archivo de señal de pausa si existe de ejecuciones anteriores
  const pauseSignalFile = path.join(cwd, '.pause-signal');
  await fs.unlink(pauseSignalFile).catch(() => {});

  // Start Playwright execution in background
  isExecuting = true;
  const isWindows = process.platform === 'win32';
  child = spawn('npx', ['playwright', 'test', 'tests/execute-selected.spec.ts', '--headed'], {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit', // Show output in server terminal
    shell: true, // Required for Windows to find npx.cmd
    detached: !isWindows, // En Linux/Mac, crear grupo de procesos para poder matar todo el árbol
    env: { 
      ...process.env, 
      HEADLESS: 'false' // Force headless to false
    }
  });
  
  // Monitorear archivo de señal de auto-save para generar reportes intermedios
  const autoSaveSignalFile = path.join(cwd, '.autosave-signal');
  let autoSaveWatcher: ReturnType<typeof setInterval> | null = null;
  
  // Limpiar señal de auto-save si existe de ejecuciones anteriores
  await fs.unlink(autoSaveSignalFile).catch(() => {});
  
  // Iniciar monitoreo de señal de auto-save cada 10 segundos
  autoSaveWatcher = setInterval(async () => {
    if (!isExecuting) return;
    
    try {
      const signalContent = await fs.readFile(autoSaveSignalFile, 'utf8');
      const signal = JSON.parse(signalContent);
      
      console.log(`\n💾 [Auto-Save] Señal recibida - Generando reporte intermedio #${signal.autoSaveCount}...`);
      
      // Procesar archivos de conversación para generar reporte intermedio
      // keepFile = true para NO mover el archivo a .trash (ejecución activa)
      const result = await processOrphanedConversationFiles(signal.executionId, true);
      if (result.processed) {
        console.log(`💾 [Auto-Save] ✅ Reporte intermedio generado con ${result.eventCount} eventos (${signal.totalProcessed}/${signal.totalExamples})`);
      }
      
      // Eliminar señal después de procesarla
      await fs.unlink(autoSaveSignalFile).catch(() => {});
    } catch {
      // No hay señal o error al leer - ignorar
    }
  }, 10000); // Verificar cada 10 segundos

  child.on('close', async (code: number | null) => {
    // Detener monitoreo de auto-save
    if (autoSaveWatcher) {
      clearInterval(autoSaveWatcher);
      autoSaveWatcher = null;
    }
    await fs.unlink(autoSaveSignalFile).catch(() => {}); // Limpiar señal si quedó
    
    isExecuting = false;
    isPostProcessing = true; // Iniciar post-procesamiento
    isPausing = false; // Reset flag de pausa
    child = null; // Limpiar referencia al proceso
    const wasInterrupted = code === 130 || code === null; // 130 = SIGINT (pausa UI/Ctrl+C)
    const executionIdForReport = currentExecutionId || executionId; // Guardar antes de limpiar
    
    // Limpiar archivo de señal de pausa
    const pauseSignalCleanup = path.join(path.resolve(__dirname, '../..'), '.pause-signal');
    await fs.unlink(pauseSignalCleanup).catch(() => {});
    
    console.log(`\n[Execution] Proceso finalizado con código: ${code}${wasInterrupted ? ' (INTERRUMPIDO)' : ''}`);
    
    // Wait a bit to ensure files are fully written
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Procesar archivos de conversación pendientes usando la función reutilizable
    // Si fue interrumpido (pausado), conservar el archivo para poder reanudar
    const result = await processOrphanedConversationFiles(executionIdForReport, wasInterrupted);
    if (result.processed) {
      if (wasInterrupted) {
        console.log(`[Execution] ⏸️ Reporte generado con ${result.eventCount} eventos (archivo conservado para reanudar)`);
      } else {
        console.log(`[Execution] ✅ Reporte generado con ${result.eventCount} eventos`);
      }
    }
    
    // Find the most recent HTML report (prefer specific execution ID)
    const conversationsDir = path.resolve(__dirname, '../../test-results/conversations');
    let latestHtml = null;
    
    // Primero intentar buscar el HTML específico de esta ejecución
    if (executionIdForReport) {
      const specificHtml = path.join(conversationsDir, `Ejecucion-${executionIdForReport}.html`);
      try {
        await fs.access(specificHtml);
        latestHtml = specificHtml;
        console.log(`[Execution] 📝 HTML específico encontrado: Ejecucion-${executionIdForReport}.html`);
      } catch {
        // No existe, buscar el más reciente
      }
    }
    
    // Si no hay HTML específico, buscar el más reciente
    if (!latestHtml) {
      try {
        const files = await fs.readdir(conversationsDir);
        const htmlFiles = files
          .filter(f => f.endsWith('.html') && f !== 'index.html')
          .map(f => ({
            name: f,
            path: path.join(conversationsDir, f),
            time: statSync(path.join(conversationsDir, f)).mtimeMs
          }))
          .sort((a, b) => b.time - a.time);
        
        if (htmlFiles.length > 0) {
          latestHtml = htmlFiles[0].path;
          console.log(`[Execution] 📝 HTML más reciente: ${htmlFiles[0].name}`);
        }
      } catch (e) {
        console.warn('[Execution] ⚠️ No se pudo determinar el HTML generado');
      }
    }
    
    // Convert HTML reports to PDF automatically (ALWAYS, even if there were errors or interrupted)
    console.log(`\n[Execution] 📄 ${wasInterrupted ? 'Generando PDF parcial (interrumpido)' : 'Convirtiendo reportes HTML a PDF'}...`);
    const pdfArgs = latestHtml ? ['scripts/export-report-to-pdf.mjs', latestHtml] : ['scripts/export-report-to-pdf.mjs'];
    const pdfChild = spawn('node', pdfArgs, {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    pdfChild.on('close', async (pdfCode) => {
      if (pdfCode === 0) {
        console.log(`[Execution] ✅ ${wasInterrupted ? 'PDF parcial generado' : 'Reportes convertidos a PDF'} exitosamente`);
        if (wasInterrupted) {
          console.log(`[Execution] 💡 Al reanudar, el PDF se actualizará con las nuevas conversaciones`);
        }
      } else {
        console.warn(`[Execution] ⚠️ Error al convertir reportes a PDF (código ${pdfCode})`);
      }
      
      isPostProcessing = false; // Post-procesamiento completo
      currentExecutionId = null;
      
      // SIEMPRE conservar temp-exec (nunca borrar)
      if (tempConfigPath) {
        console.log(`[Execution] 💾 Archivo temp-exec conservado: ${path.basename(tempConfigPath)}`);
      }
    });
    
    pdfChild.on('error', async (err) => {
      console.error(`[Execution] ❌ Error al convertir a PDF: ${err.message}`);
      // SIEMPRE conservar archivos (nunca borrar)
    });
  });

  child.on('error', (err: Error) => {
    isExecuting = false;
    isPostProcessing = false;
    isPausing = false; // Reset flag de pausa
    currentExecutionId = null;
    child = null; // Limpiar referencia
    console.error(`[Execution] Error en spawn: ${err.message}`);
  });
});

app.post('/api/pause-execution', async (_req, res) => {
  if (!isExecuting) {
    return res.status(400).json({ error: 'No hay ejecución en curso' });
  }
  
  if (!child) {
    return res.status(400).json({ error: 'Proceso no encontrado' });
  }
  
  if (isPausing) {
    return res.status(409).json({ error: 'Ya se está pausando la ejecución' });
  }
  
  console.log('\n[Admin] ⏸ Solicitud de pausa recibida desde interfaz');
  isPausing = true;
  
  try {
    const cwd = path.resolve(__dirname, '../..');
    const pauseSignalFile = path.join(cwd, '.pause-signal');
    
    // Crear archivo de señal de pausa para que el test lo detecte
    await fs.writeFile(pauseSignalFile, JSON.stringify({ 
      timestamp: Date.now(),
      executionId: currentExecutionId 
    }), 'utf8');
    console.log('[Admin] 📄 Archivo de señal de pausa creado');
    
    // Dar tiempo al test para detectar la señal (5 segundos)
    // Si no termina, enviar SIGINT
    setTimeout(() => {
      if (child && isExecuting) {
        console.log('[Admin] ⏰ Timeout - enviando SIGINT al proceso');
        const pid = child.pid;
        if (pid) {
          try {
            process.kill(-pid, 'SIGINT');
          } catch (e) {
            child.kill('SIGINT');
          }
        } else {
          child.kill('SIGINT');
        }
      }
    }, 5000);
    
    console.log('[Admin] 💾 El progreso se guardará en checkpoint');
    
    res.json({ 
      ok: true, 
      message: 'Ejecución pausada. El progreso se está guardando...',
      executionId: currentExecutionId
    });
  } catch (err: any) {
    console.error('[Admin] Error al pausar:', err);
    isPausing = false; // Reset flag on error
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/execution-status', async (_req, res) => {
  // Buscar si hay checkpoint pendiente
  const cwd = path.resolve(__dirname, '../..');
  let checkpointInfo = null;
  
  try {
    const files = await fs.readdir(cwd);
    const checkpointFiles = files.filter(f => f.startsWith('checkpoint-'));
    
    if (checkpointFiles.length > 0) {
      const latestCheckpoint = checkpointFiles.sort().reverse()[0];
      const checkpointPath = path.join(cwd, latestCheckpoint);
      const checkpointData = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      
      checkpointInfo = {
        exists: true,
        file: latestCheckpoint,
        totalProcessed: checkpointData.totalProcessed,
        totalExamples: checkpointData.totalExamples,
        lastCompletedIntent: checkpointData.lastCompletedIntent,
        currentIntent: checkpointData.currentIntent,
        currentExampleIndex: checkpointData.currentExampleIndex,
        timestamp: checkpointData.timestamp,
        interruptionCount: checkpointData.interruptionCount || 0
      };
    }
  } catch (err) {
    console.error('[Checkpoint] Error al buscar checkpoint:', err);
  }
  
  res.json({ 
    isExecuting, 
    isPostProcessing,
    isPausing,
    executionId: currentExecutionId,
    checkpoint: checkpointInfo
  });
});

app.get('/api/open-reports', async (_req, res) => {
  const reportsPath = path.resolve(__dirname, '../../exports/test-results/conversations');
  
  try {
    // Check if the directory exists
    try {
      await fs.access(reportsPath);
    } catch {
      return res.status(404).json({ 
        error: 'La carpeta de reportes no existe aún. Ejecuta algunos tests primero.',
        path: reportsPath 
      });
    }

    // Open file explorer based on OS
    const { exec } = await import('child_process');
    const command = process.platform === 'win32' 
      ? `explorer "${reportsPath}"`
      : process.platform === 'darwin'
      ? `open "${reportsPath}"`
      : `xdg-open "${reportsPath}"`;

    exec(command, (error) => {
      if (error) {
        console.error(`Error abriendo carpeta: ${error.message}`);
      }
    });

    res.json({ 
      ok: true, 
      path: reportsPath,
      message: 'Abriendo explorador de archivos...'
    });
  } catch (e: any) {
    res.status(500).json({ 
      error: `Error: ${e.message}`,
      path: reportsPath 
    });
  }
});

const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, async () => {
  console.log(`Admin UI disponible en http://localhost:${PORT}`);
  
  // Verificar si hay una ejecución en progreso (checkpoint o temp-exec activo) antes de procesar archivos
  const cwd = path.resolve(__dirname, '../..');
  const files = await fs.readdir(cwd).catch(() => []);
  const hasActiveCheckpoint = files.some(f => f.startsWith('checkpoint-') && f.endsWith('.json'));
  const hasActiveExecution = files.some(f => f.startsWith('temp-exec-') && f.endsWith('.json'));
  const hasConversationFile = files.some(f => f.startsWith('conversation-') && f.endsWith('.json'));
  
  // Proteger si existe CUALQUIER indicador de ejecución activa (OR, no AND)
  if (hasActiveCheckpoint || hasActiveExecution) {
    console.log('[Startup] ⏸️  Ejecución pausada detectada - NO se procesan archivos de conversación');
    console.log('[Startup] ✓ Los archivos se procesarán cuando finalice la ejecución');
  } else if (hasConversationFile) {
    // Hay archivo de conversación pero sin checkpoint ni temp-exec
    // Preguntar al usuario o simplemente no procesarlo automáticamente
    console.log('[Startup] ⚠️  Archivo de conversación encontrado sin ejecución activa');
    console.log('[Startup] 💡 Use la interfaz para procesar o descartar el archivo');
  } else {
    console.log('[Startup] ✓ No hay archivos pendientes');
  }
  
  // Auto-open browser
  const { exec } = await import('child_process');
  const url = `http://localhost:${PORT}`;
  const command = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;
  
  exec(command, (error) => {
    if (error) {
      console.log('No se pudo abrir el navegador automáticamente. Abre manualmente:', url);
    }
  });
});

server.on('error', (err: any) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\n[Admin] Error: El puerto ${PORT} ya está en uso. Cambia la variable de entorno PORT o cierra el proceso que lo usa.`);
  } else {
    console.error(`\n[Admin] Error al iniciar el servidor: ${err?.message || err}`);
  }
  process.exit(1);
});

// Manejador de SIGINT (Ctrl+C) para cerrar gracefully
let isShuttingDown = false;
process.on('SIGINT', async () => {
  if (isShuttingDown) {
    console.log('\n[Admin] Forzando cierre...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log('\n\n[Admin] 🛑 Señal de interrupción recibida (Ctrl+C)');
  
  // Si hay una ejecución en progreso o post-procesamiento, esperar
  if (isExecuting || isPostProcessing) {
    console.log('[Admin] ⏳ Esperando a que termine la ejecución de tests...');
    console.log('[Admin] 💡 El reporte HTML y PDF se generarán automáticamente');
    console.log('[Admin] 💡 Presiona Ctrl+C nuevamente SOLO si es urgente (se perderá el reporte)\n');
    
    // Esperar hasta que termine la ejecución Y el post-procesamiento (máximo 20 segundos)
    const maxWait = 20000;
    const startWait = Date.now();
    while ((isExecuting || isPostProcessing) && (Date.now() - startWait) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (isExecuting || isPostProcessing) {
      console.log('[Admin] ⚠️ Tiempo de espera agotado, cerrando de todos modos...');
    } else {
      console.log('[Admin] ✅ Ejecución finalizada, reportes generados');
    }
  }
  
  console.log('[Admin] 👋 Cerrando servidor...\n');
  server.close(() => {
    process.exit(0);
  });
  
  // Si el servidor no cierra en 3 segundos, forzar
  setTimeout(() => {
    process.exit(0);
  }, 3000);
});
