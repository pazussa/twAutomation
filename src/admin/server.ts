import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// ESM dirname emulation early so later helpers can use it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Import using explicit .ts so ts-node ESM can resolve the source file
// We'll lazy import the data module to avoid ESM resolution issues with ts-node.
let INTENTS_TEMPLATES: any; let VARS: any; let KEYWORD_RULES: any; let setVar: any; let withVars: any; let DEFAULT_VARS: any;
async function loadDataModule() {
  if (!INTENTS_TEMPLATES) {
  const mod = await import('../../tests/setup/data.ts');
    INTENTS_TEMPLATES = mod.INTENTS_TEMPLATES;
    VARS = mod.VARS;
    KEYWORD_RULES = mod.KEYWORD_RULES;
    setVar = mod.setVar;
    withVars = mod.withVars;
    DEFAULT_VARS = mod.DEFAULT_VARS;
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

async function persistAddRule(regex: string, action: { type: string; reply?: string }, note?: string) {
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
  if (action.type === 'REPLY') {
    ruleLineParts.push(`  { pattern: /${regEscaped}/i, action: { type: 'REPLY', reply: '${(action.reply||'').replace(/'/g, "\\'")}' }, note: '${(note||'UI added').replace(/'/g, "\\'")}' },`);
  } else if (action.type === 'END_OK' || action.type === 'END_ERR') {
    ruleLineParts.push(`  { pattern: /${regEscaped}/i, action: { type: '${action.type}' }, note: '${(note||'UI added').replace(/'/g, "\\'")}' },`);
  } else {
    throw new Error('Acción no soportada para persistencia');
  }
  const updated = file.replace(/(export const KEYWORD_RULES:[\s\S]*?\n)];/, (m) => m.replace('\n];', '\n' + ruleLineParts.join('\n') + '\n];'));
  await writeDataFile(updated);
  // reflect in memory
  const pattern = new RegExp(regex, 'i');
  if (action.type === 'REPLY') {
    KEYWORD_RULES.push({ pattern, action: { type: 'REPLY', reply: action.reply }, note });
  } else {
    KEYWORD_RULES.push({ pattern, action: { type: action.type }, note });
  }
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


const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to rebuild intents preview (without materialization here for simplicity)
function getState() {
  return {
    variables: { ...VARS },
    defaultVariables: { ...DEFAULT_VARS },
    intents: Object.entries(INTENTS_TEMPLATES as Record<string, string[]>).map(([k, arr]) => ({ name: k, examples: arr })),
    rules: (KEYWORD_RULES as Array<{ pattern: RegExp; action: { type: string; reply?: string }; note?: string }>).map(r => ({ pattern: r.pattern.toString(), action: r.action.type, note: r.note || '' }))
  };
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

app.post('/api/rules', async (req, res) => {
  await loadDataModule();
  const { regex, action, note, reply } = req.body || {};
  if (!regex || !action) return res.status(400).json({ error: 'regex y action requeridos' });
  let pattern: RegExp;
  try { pattern = new RegExp(regex, 'i'); } catch { return res.status(400).json({ error: 'regex inválida' }); }
  const act = (() => {
    if (action === 'END_OK') return { type: 'END_OK' } as const;
    if (action === 'END_ERR') return { type: 'END_ERR' } as const;
    if (action === 'REPLY') {
      if (!reply) return res.status(400).json({ error: 'reply requerido para action REPLY' });
      return { type: 'REPLY', reply: String(reply) } as const;
    }
    return null;
  })();
  if (!act) return res.status(400).json({ error: 'action inválida (permitidos: END_OK, END_ERR, REPLY)' });
  try {
    await persistAddRule(regex, act as any, note);
    res.json({ ok: true, total: KEYWORD_RULES.length });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.listen(3000, () => {
  console.log('Admin UI disponible en http://localhost:3000');
});
