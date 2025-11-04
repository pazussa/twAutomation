import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs/promises';

// ESM dirname emulation early so later helpers can use it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Import using explicit .ts so ts-node ESM can resolve the source file
// We'll lazy import the data module to avoid ESM resolution issues with ts-node.
let INTENTS_TEMPLATES: any; let INTENTS: any; let VARS: any; let KEYWORD_RULES: any; let setVar: any; let withVars: any; let DEFAULT_VARS: any;
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
    ruleLineParts.push(`  { pattern: /${regEscaped}/i, action: { type: 'REPLY', reply: '${(action.reply||'').replace(/'/g, "\\'")}' }, note: '${(note||'UI added').replace(/'/g, "\\'")}', priority: 1${intentsStr} },`);
  } else if (action.type === 'END_OK' || action.type === 'END_ERR') {
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
    newRuleLine = `  { pattern: /${regEscaped}/i, action: { type: 'REPLY', reply: '${(action.reply||'').replace(/'/g, "\\'")}' }, note: '${(note||'UI updated').replace(/'/g, "\\'")}', priority: 1${intentsStr} },`;
  } else if (action.type === 'END_OK' || action.type === 'END_ERR') {
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
  
  // Buscar la línea de la variable
  const varPattern = new RegExp(`^(\\s*${name}:\\s*)'([^']*)'(,?)$`, 'gm');
  const match = varPattern.exec(file);
  
  if (!match) throw new Error('No se pudo localizar la variable en el archivo');
  
  const newLine = `${match[1]}'${value.replace(/'/g, "\\'")}'${match[3]}`;
  const updated = file.replace(varPattern, newLine);
  
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


const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to rebuild intents preview
function getState() {
  const state = {
    variables: { ...VARS },
    defaultVariables: { ...DEFAULT_VARS },
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
    await persistUpdateVariable(name, String(value ?? ''));
    res.json({ ok: true, name, value: VARS[name] });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/variables/:name', async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) return res.status(400).json({ error: 'name requerido' });
    await persistDeleteVariable(name);
    res.json({ ok: true, deleted: name });
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
    if (actionType === 'REPLY') {
      if (!actionReply) return res.status(400).json({ error: 'reply requerido para action REPLY' });
      return { type: 'REPLY', reply: String(actionReply) } as const;
    }
    return null;
  })();
  if (!act) return res.status(400).json({ error: 'action inválida (permitidos: END_OK, END_ERR, REPLY)' });
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
    if (actionType === 'REPLY') return { type: 'REPLY', reply: String(actionReply) } as const;
    return null;
  })();
  if (!act) return res.status(400).json({ error: 'action inválida (permitidos: END_OK, END_ERR, REPLY)' });
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
let currentExecutionId: string | null = null;

app.post('/api/execute', async (req, res) => {
  if (isExecuting) {
    return res.status(409).json({ error: 'Ya hay una ejecución en proceso' });
  }

  const { examples } = req.body || {};
  if (!Array.isArray(examples) || examples.length === 0) {
    return res.status(400).json({ error: 'Se requiere array de ejemplos' });
  }

  // Generate execution ID
  const executionId = crypto.randomBytes(8).toString('hex');
  currentExecutionId = executionId;

  // Save selected examples to temp file
  const tempConfigPath = path.resolve(__dirname, `../../temp-exec-${executionId}.json`);
  try {
    await fs.writeFile(tempConfigPath, JSON.stringify({ examples }, null, 2), 'utf8');
  } catch (e: any) {
    return res.status(500).json({ error: `Error escribiendo config temporal: ${e.message}` });
  }

  // Respond immediately
  res.json({ ok: true, executionId, examples: examples.length });

  // Start Playwright execution in background
  isExecuting = true;
  const child = spawn('npx', ['playwright', 'test', 'tests/execute-selected.spec.ts', '--headed'], {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit', // Show output in server terminal
    shell: true, // Required for Windows to find npx.cmd
    env: { 
      ...process.env, 
      EXEC_CONFIG: tempConfigPath,
      HEADLESS: 'false' // Force headless to false
    }
  });

  child.on('close', async (code) => {
    isExecuting = false;
    currentExecutionId = null;
    console.log(`\n[Execution] Proceso finalizado con código: ${code}`);
    
    // Convert HTML reports to PDF automatically (ALWAYS, even if there were errors)
    console.log(`\n[Execution] 📄 Convirtiendo reportes HTML a PDF...`);
    const pdfChild = spawn('node', ['scripts/export-report-to-pdf.mjs'], {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    pdfChild.on('close', async (pdfCode) => {
      if (pdfCode === 0) {
        console.log(`[Execution] ✅ Reportes convertidos a PDF exitosamente`);
      } else {
        console.warn(`[Execution] ⚠️ Error al convertir reportes a PDF (código ${pdfCode})`);
      }
      
      // Clean up temp file after PDF conversion
      try {
        await fs.unlink(tempConfigPath);
      } catch (e) {
        // Silent cleanup - ignore errors
      }
    });
    
    pdfChild.on('error', (err) => {
      console.error(`[Execution] ❌ Error al convertir a PDF: ${err.message}`);
      // Clean up temp file silently
      fs.unlink(tempConfigPath).catch(() => {});
    });
  });

  child.on('error', (err) => {
    isExecuting = false;
    currentExecutionId = null;
    console.error(`[Execution] Error en spawn: ${err.message}`);
  });
});

app.get('/api/execution-status', (_req, res) => {
  res.json({ 
    isExecuting, 
    executionId: currentExecutionId 
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
