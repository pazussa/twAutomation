import 'dotenv/config';
import { chromium, type BrowserContext, type Page, type Locator } from 'playwright';
import { test as base, expect } from '@playwright/test';

/* =========================
   Tipos para el reporte
   ========================= */
type ConvKind = 'send' | 'recv' | 'intent';
type ConversationLogger = {
  logSent: (text: string) => void;
  logReceived: (texts: string[]) => void;
  logRecvFailure: (reason: string) => void;
  logIntent: (label: string, idx?: number, total?: number) => void;
};

/* =========================
   Utilidades de placeholders
   ========================= */
function materialize(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}
function materializeAll(list: ReadonlyArray<string>, vars: Record<string, string>): string[] {
  return list.map((t) => materialize(t, vars));
}

/* ==============
   Config general
   ============== */
const CFG = {
  contactName: process.env.CONTACT_NAME || 'Twilio',
  headless: (process.env.HEADLESS || 'false').toLowerCase() === 'true',
  sessionDir: (process.env.SESSION_DIR || '~/.wapp-autoloop-session').replace('~', process.env.HOME || ''),
  cmds: {
    listar: process.env.CMD_LISTAR || 'listar cultivos',
    crear: process.env.CMD_CREAR || 'crear cultivo',
    listarFert: process.env.CMD_LISTAR_FERT || 'listar fertilizantes',
    crearFert: process.env.CMD_CREAR_FERT || 'crear fertilizante',
    listarFito: process.env.CMD_LISTAR_FITO || 'Listar productos químicos',
    crearFito: process.env.CMD_CREAR_FITO || 'crear fitosanitario',
    consultarCampos: process.env.CMD_CONSULTAR_CAMPOS || 'Consultar campos sin planificar',
    consultarDistribucion: process.env.CMD_CONSULTAR_DISTRIBUCION || 'Consultar distribución cultivos',
    crearCampana: process.env.CMD_CREAR_CAMPANA || 'Crear campaña',
    consultarTrabajos: process.env.CMD_CONSULTAR_TRABAJOS || 'Consultar trabajos',
    consultarTrabajosHoy: process.env.CMD_CONSULTAR_TRABAJOS_HOY || 'Consultar trabajos (hoy)',
    asignarPreciosProducto: process.env.CMD_ASIGNAR_PRECIOS_PRODUCTO || 'Asignar precios producto'
  }
};

/* ==========================
   Variables (placeholders)
   ========================== */
// Defaults robustos que suelen “entrar” cuando no hay opciones
const VARS: Record<string, string> = {
  cultivo: process.env.VAR_CULTIVO || 'maíz',
  variedad: process.env.VAR_VARIEDAD || 'p 8660',
  destino: process.env.VAR_DESTINO || 'consumo',
  marca: process.env.VAR_MARCA || 'marcax',
  cliente: process.env.VAR_CLIENTE || 'AgroTalavera',
  campana: process.env.VAR_CAMPANA || 'campaña-test',
  granja: process.env.VAR_GRANJA || 'Finca La Vega',
  campo: process.env.VAR_CAMPO || 'campo 2',
  dosis: process.env.VAR_DOSIS || '100',

  // Precios
  productName: process.env.VAR_PRODUCT_NAME || 'Trigo Filón',
  price: process.env.VAR_PRICE || '340 €',
  priceDate: process.env.VAR_PRICE_DATE || 'hoy'
};

// Snapshot de valores por defecto para restaurar al inicio de cada intent
const DEFAULT_VARS: Readonly<Record<string, string>> = { ...VARS };

function resetVarsToDefaults() {
  for (const [k, v] of Object.entries(DEFAULT_VARS)) {
    setVar(k, v);
  }
}

export const setVar = (name: string, value: string) => {
  if (!name || !/^\w+$/.test(name)) throw new Error(`Nombre de variable inválido: "${name}"`);
  VARS[name] = String(value);
};
export const withVars = (vars: Record<string, string>) => {
  for (const [k, v] of Object.entries(vars)) setVar(k, String(v));
};

/* =====================
   Intents (por flujo)
   ===================== */
const INTENTS_TEMPLATES = {
  crearCultivo: [
    'crear cultivo',
    'añadir cultivo',
    'quiero crear un cultivo',
    'quiero registrar un cultivo',
    'registrar cultivo',
    'necesito crear un cultivo',
    'crear un nuevo cultivo',
    'quiero dar de alta un cultivo',
    'agrega un cultivo',
    'agrega un nuevo cultivo',
    'deseo crear un cultivo',
    'generar un cultivo',
    'crea un cultivo nuevo',
    'registra un cultivo',
    'quiero cargar un nuevo cultivo',
    'agregar cultivo',
    'registrar un cultivo nuevo',
    'me gustaría crear un cultivo nuevo',

    // Con variables
    'Luca, registra cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} y cliente {cliente}.',
    'Guardar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca}',
    'Luca, agregar el cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} para cliente {cliente}.',
    'Hola LUCA, registrar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} para el cliente {cliente}',
    'Guardar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} para el cliente {cliente}',
    'crear cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con el cliente {cliente}',
    'Luca, agrega cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} cliente {cliente}',
    'Luca, agrega cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'Luca regístrame cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'Hola luca, quiero crear el cultivo {cultivo} con variedad {variedad} con destino {destino} y marca {marca} con el cliente {cliente}',
    'luca, me puedes registrar el cultivo {cultivo} con variedad {variedad} con destino {destino} y marca {marca} con el cliente {cliente}',
    'luca, quiero registrar el cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'hola luca, agregame el cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'Guardar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} cliente {cliente}',
    'Agregame el cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca}, cliente {cliente}',
    'Necesito registrar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'Guardar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca}, para el cliente {cliente}',
    'Luca, apúntame el cultivo {cultivo} variedad {variedad} destino {destino} marca {marca} con cliente {cliente}',
    'Luca registra cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca}, cliente {cliente}',
    'Apunta cultivo {cultivo} con variedad {variedad}, destino {destino}, marca {marca} cliente {cliente}',
    'Luca agrega cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} para cliente {cliente}',
    'Hola luca, necesito registrar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}'
  ],

  listarCultivos: [
    'listar cultivos',
    'dame la lista de cultivos',
    'listar cultivos variedad {variedad}'
  ],

  crearFertilizante: ['crear fertilizante', 'añadir fertilizante'],
  listarFertilizantes: ['listar fertilizantes', 'lista de fertilizantes', 'dame los fertilizantes'],

  crearFitosanitario: ['crear fitosanitario', 'crear producto químico', 'añadir fitosanitario'],
  listarFitosanitarios: ['listar fitosanitarios', 'listar productos químicos', 'dame los productos químicos'],

  consultarCampos: ['consultar campos sin planificar', 'campos sin planificar', 'listar campos sin planificar'],
  consultarDistribucion: ['consultar distribución cultivos', 'distribución de cultivos', 'ver distribución de cultivos'],

  crearCampana: [
    'crear campaña',
    'añadir campaña',
    'Quiero crear campaña con {cultivo}',
    'Planifica {cultivo} variedad {variedad}',
    'Dar de alta en campaña {cultivo}',
    'Programa {cultivo} para esta campaña',
    'Apunta en la campaña {cultivo}',
    'Deja fijado en campaña {cultivo}',
    'Crear campaña con {cultivo}',
    'Asigna {cultivo} {variedad} en campaña',
    'Registra {cultivo} {variedad} para esta campaña',
    'Quiero planificar {cultivo} {variedad}',
    'Planificar {cultivo} para la campaña',
    'Dar de alta {cultivo} {variedad}',
    'Asigna {cultivo} {variedad} al {campo}',
    'Planifica {cultivo} en {granja} para {cliente}',
    'Programa {cultivo} en {campo} de {granja} para {cliente}',
    'Apunta en camp. {cultivo} en {granja}',
    'Asignar {cultivo} a la {campo} de {granja}',
    'Dar de alta {cultivo} en {campo} para {cliente}',
    'Planifica {cultivo} en {granja}',
    'Programa {cultivo} {variedad} para {cliente}',
    'Asigna {cultivo} en {campo} para {cliente}',
    'Deja {cultivo} en {granja} para {cliente}',
    'Apunta {cultivo} {variedad} en {campo} de {granja}',
    'Programa {cultivo} en {campo} de {granja} para {cliente}',
    'Planifica {cultivo} en {campo} de {granja}',
    'Registra {cultivo} en {campo}',
    'Crea campaña con {cultivo} {variedad} en {granja}, {campo} para {cliente}',
    'Planifica {cultivo} {variedad} en {granja} {campo}',
    'Perdona, para la campaña deja {cultivo} {variedad} en {campo} de {granja}, no en el 2',
    'q sea crear camp. de {cultivo} en {campo} de {granja}, xfa'
  ],

  consultarTrabajos: ['consultar trabajos', 'listar trabajos', 'qué trabajos hay'],
  consultarTrabajosHoy: ['consultar trabajos (hoy)', 'trabajos de hoy', 'qué trabajos hay hoy'],

  asignarPreciosProducto: [
    'asignar precios producto',
    'asignar precios a producto',
    'asignar precio a producto',
    'Hola Luca, asigna un precio de {price}/tonelada al {productName}',
    'Hola Luca, acabo de recibir una factura a {price}/tonelada el {productName} a fecha {priceDate}',
    'Establece {price} /tn para el {productName}',
    'Hola Luca, el {productName} queda a {price} por tonelada desde el {priceDate}',
    'Sube el precio del {productName} a {price} /tn',
    'Asigna para la {productName} un precio de {price} con fecha de hoy',
    'Coloca {price} /tonelada al {productName} a partir del {priceDate}',
    'Luca, el precio del {productName} será de {price} /tn desde hoy',
    'Para el {productName}, pon {price} euros por tonelada',
    'Ponme {price} euros/tn a la {productName} de este año',
    'Quiero que el precio de la {productName} sea de {price} a fecha {priceDate}',
    'El {productName} sube a {price} /tonelada desde el {priceDate}',
    'Fija para la {productName} un precio de {price} hoy mismo',
    'Quiero {price} euros por tonelada para la {productName} del {priceDate}',
    'Pon el {productName} a {price} /tn desde hoy',
    'Luca, actualiza el precio de la {productName} a {price}, fecha {priceDate}',
    'Para la {productName}, establece {price} /tonelada desde el {priceDate}',
    'Sube la {productName} a {price} /tn hoy',
    '{productName} a {price} /tonelada desde el {priceDate}',
    'Quiero asignar para el {productName} un precio de {price}',
    'Pon el {productName} a {price}, fecha {priceDate}',
    'Fija hoy mismo {price} euros por tonelada para la {productName}',
    'Asigna precio al {productName}',
    'Pon {price} al {productName}',
    'Registra el importe de {price} para {productName}',
    'Quiero dar de alta el precio del {productName} {priceDate}',
    'Actualiza a {price} el {productName} a fecha {priceDate}',
    'Apunta precio para {productName} {priceDate}',
    'Pónle {price} al {productName} para {cliente}',
    'Actualiza el valor del {productName} a {price} {priceDate}',
    'Registra {price} en {productName} con fecha {priceDate}',
    'Quiero fijar precio al {productName} para {cliente}',
    'Dar de alta {price} al {productName} a fecha {priceDate}',
    'Pon el coste del {productName} en {price}',
    'Apunta {price} para {productName} {priceDate}',
    'Actualiza el {productName} a {price} para {cliente}',
    'Registra precio de {productName}',
    'Quiero poner {price} al {productName} con fecha {priceDate}',
    'Da de alta el precio del {productName} {priceDate}',
    'Apunta el valor de {productName} para {cliente}',
    'Fija {price} al {productName}',
    'Actualízame el precio de {productName} a {price} con fecha {priceDate}',
    'Poner precio a {productName} {priceDate}',
    'Asigna {price} a {productName} para {cliente}',
    'Registra el importe del {productName} en {price} para {cliente}',
    'Apunta {price} a {productName}',
    'Actualiza a {price} el {productName} con fecha {priceDate}',
    'Perdona, corrige el precio del {productName} a {price} {priceDate}',
    'Me refería a asignar {price} al {productName}, no {price}',
    'Cambio: deja el {productName} en {price} con fecha {priceDate}',
    'Apúntame precio para {productName} {priceDate} xfa',
    'q pongas {price} al {productName} para {cliente}'
  ]
} as const;

const INTENTS = Object.fromEntries(
  Object.entries(INTENTS_TEMPLATES).map(([k, arr]) => [k, materializeAll(arr, VARS)])
) as Record<keyof typeof INTENTS_TEMPLATES, string[]>;

/* =====================
   Selectores y helpers
   ===================== */
const SELECTORS = {
  appReady: "[data-testid='pane-side'],[data-testid='chat-list'],[aria-label='Lista de chats'],[role='grid']",
  qrAny: "canvas[aria-label*='QR'],img[alt*='QR'],[data-testid='qr-code'],canvas[aria-label*=QR]",
  composer: "footer div[contenteditable='true'], div[contenteditable='true'][role='textbox']",
  messageIn: 'div.message-in',
  chatListItems: "[data-testid='chat-list'] [data-testid*='cell-frame']"
} as const;

const TWILIO_VARIANTS = (name: string) => [
  name,
  'Twilio',
  '+1 (415) 523-8886',
  '+14155238886',
  '415 523-8886',
  '4155238886'
];

// Enviar “cancelar” tras cada intent para resetear
const AUTO_CANCEL_AFTER_INTENT = true;
// Tiempo máximo por intent (ms). Lo dejamos en infinito para no cortar el intent antes de finalizar.
const MAX_INTENT_MS = Number.POSITIVE_INFINITY;

// Función auxiliar para terminar intent: enviar cancelar solo en caso de timeout
async function finishIntent(page: Page, conversation: ConversationLogger, isTimeout: boolean = false) {
  if (isTimeout && AUTO_CANCEL_AFTER_INTENT) {
    conversation.logSent('cancelar');
    await typeIntoComposer(page, 'cancelar');
    await page.waitForTimeout(500).catch(() => {});
  }
  // Limpiar pantalla después de cualquier finalización
  await clearChat(page).catch(() => {});
}

/* ==========================
   Reglas de palabra clave
   ========================== */
type Action =
  | { type: 'REPLY'; reply: string }
  | { type: 'END_OK' }
  | { type: 'END_ERR' }
  | { type: 'RETRY_EXISTS' }; // nuevo: reintentar si “Ya existe”

const KEYWORD_RULES: Array<{
  pattern: RegExp;
  action: Exclude<Action, { type: 'RETRY_EXISTS' }>;
  note?: string;
}> = [
  // ERRORES Y TERMINACIONES (para evitar bucles infinitos)
  { pattern: /No se encontró el cultivo|Cultivo no encontrado|no se pudo encontrar/i, action: { type: 'END_ERR' }, note: 'Cultivo no encontrado - termina' },
  { pattern: /Ha ocurrido un error|Error al procesar|no se pudo completar/i, action: { type: 'END_ERR' }, note: 'Error general - termina' },
  { pattern: /Gracias por usar|Hasta luego|Adiós/i, action: { type: 'END_OK' }, note: 'Despedida - termina' },
  
  // Listados OK
  { pattern: /Cultivo:/i, action: { type: 'END_OK' }, note: 'Lista de cultivos recibida' },

  // Confirmaciones de éxito
  { pattern: /campaña (cread[oa]) exitosamente/i, action: { type: 'END_OK' }, note: 'Campaña creada' },
  { pattern: /cultivo creado exitosamente/i, action: { type: 'END_OK' }, note: 'Cultivo creado' },
  { pattern: /fertilizante creado exitosamente/i, action: { type: 'END_OK' }, note: 'Fertilizante creado' },
  { pattern: /(fitosanitario|producto químico|producto) creado exitosamente/i, action: { type: 'END_OK' }, note: 'Fitosanitario/Producto creado' },
  { pattern: /(cread[oa]) exitosamente|éxito|confirmad[oa]/i, action: { type: 'END_OK' }, note: 'Éxito genérico' },

  // Éxitos de precios
  { pattern: /(precio (asignado|actualizado|registrado)|asigno un precio|precio fijado)/i, action: { type: 'END_OK' }, note: 'Precio asignado/actualizado' },

  // Errores explícitos
  { pattern: /(error|falla|inválid[oa]|no\s+válido)/i, action: { type: 'END_ERR' }, note: 'Error explícito' },

  // Peticiones de campos (una sola respuesta por turno)
  { pattern: /^Nombre del cultivo\.?$/i,        action: { type: 'REPLY', reply: '{cultivo}' },   note: 'Pide cultivo' },
  { pattern: /^Nombre de la variedad\.?$/i,     action: { type: 'REPLY', reply: '{variedad}' },  note: 'Pide variedad' },
  { pattern: /^Destino del cultivo\.?$/i,       action: { type: 'REPLY', reply: '{destino}' },   note: 'Pide destino' },
  { pattern: /^Marca del cultivo\.?$/i,         action: { type: 'REPLY', reply: '{marca}' },     note: 'Pide marca' },
  { pattern: /^(Nombre del cliente|Cliente)\.?$/i, action: { type: 'REPLY', reply: '{cliente}' }, note: 'Pide cliente' },
  { pattern: /^Nombre de la campaña\.?$/i,      action: { type: 'REPLY', reply: '{campana}' },   note: 'Pide campaña' },
  { pattern: /^Nombre de la granja\.?$/i,       action: { type: 'REPLY', reply: '{granja}' },    note: 'Pide granja' },
  { pattern: /^Nombre del campo\.?$/i,          action: { type: 'REPLY', reply: '{campo}' },     note: 'Pide campo' },
  // Dosis (corrección solicitada)
  {
    pattern: /\bDosis\b(?:\s+(?:planificada|recomendada))?(?:\s*\((?:Kg\/?H|Kg\/?Ha|kg\/?h|kg\/?ha|KG\/?H|KG\/?HA)\))?\s*\.?$/i,
    action: { type: 'REPLY', reply: '{dosis}' },
  note: 'Pide dosis: responder {dosis}'
  },

  // Asignar precios producto
  { pattern: /^(Producto|Nombre del producto|Nombre del artículo)\.?$/i, action: { type: 'REPLY', reply: '{productName}' }, note: 'Pide producto' },
  { pattern: /^(Precio|Importe|Valor|Coste|Costo)\.?$/i,                 action: { type: 'REPLY', reply: '{price}' },       note: 'Pide precio' },
  { pattern: /^Fecha( de vigencia| de precio)?\.?$/i,                    action: { type: 'REPLY', reply: '{priceDate}' },   note: 'Pide fecha precio' }
];

// prioridad: Opciones / Ya existe / luego reglas generales
function detectActionFrom(messages: string[]): Action | null {
  // Unir todo para reglas que miran el bloque completo (Opciones, "ya existe", fin/errores globales)
  const joined = messages.join('\n');

  // 1) Opciones: responder solo la primera opción
  if (/Opciones:/i.test(joined)) {
    const first = extractFirstOption(joined);
    return { type: 'REPLY', reply: first || '1' };
  }

  // 2) Ya existe: reintento con variables aleatorias
  if (/ya existe/i.test(joined)) {
    return { type: 'RETRY_EXISTS' };
  }

  // 3) Reglas de fin/errores evaluadas sobre el bloque completo
  for (const rule of KEYWORD_RULES) {
    if (rule.action.type !== 'REPLY' && rule.pattern.test(joined)) {
      return rule.action;
    }
  }

  // 4) Reglas de respuesta puntual evaluadas mensaje a mensaje
  for (const msg of messages) {
    for (const rule of KEYWORD_RULES) {
      if (rule.action.type === 'REPLY' && rule.pattern.test(msg)) {
        return { type: 'REPLY', reply: materialize(rule.action.reply, VARS) };
      }
    }
  }

  return null;
}

function extractFirstOption(message: string): string | null {
  const optionsMatch = message.match(/Opciones:\s*([^.\n]+)/i);
  if (optionsMatch) {
    const raw = optionsMatch[1];
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }
  if (/^\s*1\.\s+/m.test(message)) return '1';
  return null;
}

function randomToken(n = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < n; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Agregar timestamp para mayor unicidad
  const timestamp = Date.now().toString(36).slice(-3);
  return result + timestamp;
}
function mutateOneVariableForRetry() {
  // Siempre mutar la marca (no mutar 'destino').
  const tok = randomToken(5);
  setVar('marca', `Yucasol-${tok}`);
}

/* ==========================
   Catálogo y randomización de cultivos
   ========================== */
const CROPS_POOL: Array<{ cultivo: string; variedades?: string[] }> = [
  { cultivo: 'trigo', variedades: ['filón', 'garbancera', 'renan', 'diva'] },
  { cultivo: 'cebada', variedades: ['planet', 'meseta', 'iskra'] },
  { cultivo: 'girasol', variedades: ['alto oleico', 'linoleico', 'pioneer'] },
  { cultivo: 'soja', variedades: ['amarilla', 'negra', 'asgrow 393'] },
  { cultivo: 'algodón', variedades: ['deltapine 1646', 'fibermax 9660'] },
  { cultivo: 'sorgo', variedades: ['p8333', 'p8422'] },
  { cultivo: 'arroz', variedades: ['bahía', 'senia', 'bomba'] },
  { cultivo: 'triticale', variedades: ['bogo', 'tritordeum'] },
  { cultivo: 'remolacha', variedades: ['kanzia', 'monalisa'] },
  { cultivo: 'patata', variedades: ['agria', 'monalisa', 'kennebec'] },
  { cultivo: 'colza', variedades: ['es capello', 'es imperio', 'lg austin'] },
  { cultivo: 'alfalfa', variedades: ['cuenca', 'saratoga', 'dormancy 9'] },
  { cultivo: 'avena', variedades: ['previsión', 'nevada'] },
  { cultivo: 'centeno', variedades: ['sangaste', 'petkus'] },
  { cultivo: 'maíz', variedades: ['p 8660', 'p1921', 'dkc 6664'] }
];

function pickRandomCrop(): { cultivo: string; variedad?: string } {
  const idx = Math.floor(Math.random() * CROPS_POOL.length);
  const item = CROPS_POOL[idx];
  const v = item.variedades && item.variedades.length
    ? item.variedades[Math.floor(Math.random() * item.variedades.length)]
    : undefined;
  return { cultivo: item.cultivo, variedad: v };
}

/* ==========================
   Playwright helpers
   ========================== */
function locator(page: Page, sel: keyof typeof SELECTORS): Locator {
  return page.locator(SELECTORS[sel]);
}

async function ensureLogin(page: Page, totalTimeout = 180_000) {
  await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + totalTimeout;
  while (Date.now() < deadline) {
    try { await page.waitForSelector(`${SELECTORS.appReady},${SELECTORS.qrAny}`, { timeout: 10_000 }); } catch { continue; }
    if ((await locator(page, 'appReady').count()) > 0) return;
    if ((await page.locator(SELECTORS.qrAny).count()) > 0) {
      try { await page.waitForSelector(SELECTORS.appReady, { timeout: 20_000 }); return; } catch {}
    }
  }
  throw new Error('No se detectó login ni QR válido a tiempo.');
}

async function openChat(page: Page, name: string) {
  await page.waitForSelector(SELECTORS.appReady, { timeout: 30_000 });
  for (const variant of TWILIO_VARIANTS(name)) {
    const chatItem = page.locator(`span[title='${variant}']`).first();
    if (await chatItem.isVisible().catch(() => false)) {
      await chatItem.click();
      await page.waitForSelector(SELECTORS.composer, { timeout: 10_000 });
      return;
    }
  }
  const chatItems = page.locator(SELECTORS.chatListItems);
  if ((await chatItems.count()) > 0) {
    await chatItems.first().click();
    await page.waitForSelector(SELECTORS.composer, { timeout: 10_000 });
    return;
  }
  throw new Error('No se pudo abrir ningún chat');
}

async function clearChat(page: Page) {
  const overflowBtn = page.locator('header div[role="button"]:has(span[data-icon="more-refreshed"])').last();
  await overflowBtn.click({ timeout: 5_000 }).catch(() => {});
  await page.waitForSelector('[role="menu"], [role="menuitem"], li:has-text("Vaciar chat"), li:has-text("Clear chat")', { timeout: 5_000 }).catch(() => {});
  const clearSelectors = [
    'div[role="button"]:has-text("Vaciar chat")',
    'li:has-text("Vaciar chat")',
    'div[role="button"]:has-text("Clear chat")',
    'li:has-text("Clear chat")'
  ];
  for (const s of clearSelectors) {
    const el = page.locator(s);
    if ((await el.count()) && (await el.first().isVisible().catch(() => false))) {
      await el.first().click();
      const conf = page.locator('div[role="button"]:has-text("Vaciar"), button:has-text("Vaciar"), div[role="button"]:has-text("Clear"), button:has-text("Clear")');
      if ((await conf.count()) > 0) await conf.first().click().catch(() => {});
      await page.waitForTimeout(800);
      return;
    }
  }
}

async function typeIntoComposer(page: Page, text: string) {
  await page.evaluate(() => {
    const prefer = document.querySelector("footer div[contenteditable='true']") as HTMLElement | null;
    const any =
      prefer ||
      (document.querySelector("div[contenteditable='true'][role='textbox']") as HTMLElement | null) ||
      (Array.from(document.querySelectorAll("div[contenteditable='true']")).pop() as HTMLElement | null);
    if (any) { (any as HTMLElement).focus(); (any as HTMLElement).click(); }
  });
  try { await page.keyboard.type(' ', { delay: 5 }); await page.keyboard.press('Backspace'); } catch {}
  await page.waitForTimeout(1000);
  await page.keyboard.type(text, { delay: 12 });
  await page.keyboard.press('Enter');
}

async function countIncoming(page: Page): Promise<number> {
  return locator(page, 'messageIn').count();
}

function sanitizeMessage(text: string): string {
  if (!text) return text;
  let out = text;
  const timePattern = /\b\d{1,2}:\d{2}\s*[\u00A0\s]?(?:a\.m\.|p\.m\.|a\.?\s*m\.?|p\.?\s*m\.?|AM|PM|am|pm)\.?\b/gi;
  out = out.replace(timePattern, '');
  out = out.replace(/\s*\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm|a\.m\.|p\.m\.|a\.?\s*m\.?|p\.?\s*m\.?)\.?\s*$/gi, '');
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
  return out;
}

async function extractBubbleText(el: Locator): Promise<string> {
  try {
    const spans = await el.locator("span.selectable-text span, span.selectable-text, span[dir='auto'], div[dir='auto']").all();
    const parts: string[] = [];
    for (const sp of spans) {
      try { const t = (await sp.innerText({ timeout: 1200 })).trim(); if (t && !parts.includes(t)) parts.push(t); } catch {}
    }
    return sanitizeMessage(parts.join(' ').trim());
  } catch { return ''; }
}

async function getNewIncomingAfter(page: Page, baseline: number): Promise<string[]> {
  const total = await countIncoming(page);
  const out: string[] = [];
  for (let i = baseline; i < total; i++) {
    try {
      const el = page.locator('div.message-in').nth(i);
      const text = await extractBubbleText(el);
      if (text) out.push(text);
    } catch {}
  }
  return out;
}

async function waitFirstResponse(page: Page, baseline: number, timeoutMs = 45_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const curr = await countIncoming(page).catch(() => baseline);
      if (curr > baseline) return true;
      await page.waitForTimeout(200).catch(() => {});
    } catch {
      await page.waitForTimeout(200).catch(() => {});
    }
  }
  return false;
}

/* ==============
   Fixtures
   ============== */
export type WppFixtures = {
  context: BrowserContext;
  page: Page;
  resetChat: () => Promise<void>;
  sendAndWait: (message: string, extraWaitMs?: number) => Promise<string[]>;
  cmds: typeof CFG.cmds;
  intents: typeof INTENTS;
  runAutoLoop: (starter: string, opts?: { resetChat?: boolean }) => Promise<{ success: boolean; reason: string }>;
  setVar: (name: string, value: string) => void;
  withVars: (vars: Record<string, string>) => void;
  conversation: ConversationLogger;
};

export const test = base.extend<WppFixtures>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext(CFG.sessionDir, {
      headless: CFG.headless,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1200,720']
    });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1180, height: 640 });
    await ensureLogin(page);
  await openChat(page, CFG.contactName);
  await clearChat(page).catch(() => {}); // Limpiado reactivado
    await use(page);
  },
  conversation: async ({}, use, testInfo) => {
    const events: Array<{ t: number; kind: ConvKind; text: string; ok: boolean; meta?: any }> = [];
    const logger: ConversationLogger = {
      logSent: (text) => {
  console.log(`Enviado: ${text}`);
        events.push({ t: Date.now(), kind: 'send', text, ok: true });
      },
      logReceived: (texts) => {
        texts.forEach((text) => {
          console.log(`Recibido: ${text}`);
          events.push({ t: Date.now(), kind: 'recv', text, ok: true });
        });
      },
      logRecvFailure: (reason) => {
  console.log(`Error: ${reason}`);
        events.push({ t: Date.now(), kind: 'recv', text: reason, ok: false });
      },
      logIntent: (label, idx, total) => {
        console.log(`\n[${idx}/${total}] ${label}`);
        events.push({ t: Date.now(), kind: 'intent', text: label, ok: true, meta: { idx, total } });
      }
    };
    await use(logger);
    await testInfo.attach('conversation', {
      contentType: 'application/json',
      body: JSON.stringify({ title: testInfo.title, events }, null, 2)
    });
  },
  resetChat: async ({ page }, use) => {
  await use(async () => { await clearChat(page).catch(() => {}); }); // Limpiado reactivado
  },
  sendAndWait: async ({ page, conversation }, use) => {
    const fn = async (message: string, extraWaitMs = 5000) => {
      const baseline = await countIncoming(page);
      conversation.logSent(message);
      await typeIntoComposer(page, message);

      let gotFirst = await waitFirstResponse(page, baseline, 45_000);
      if (!gotFirst) {
        await page.waitForTimeout(1500).catch(() => {});
        const fallbackMsgs = await getNewIncomingAfter(page, baseline);
        if (fallbackMsgs.length > 0) {
          conversation.logReceived(fallbackMsgs);
        } else {
          conversation.logRecvFailure('No hubo primera respuesta tras 45s');
        }
      }

      await page.waitForTimeout(extraWaitMs);
      let msgs = await getNewIncomingAfter(page, baseline);
      if (msgs.length === 0) {
        await page.waitForTimeout(2000).catch(() => {});
        msgs = await getNewIncomingAfter(page, baseline);
      }
      if (msgs.length === 0) {
        conversation.logRecvFailure('Sin mensajes nuevos tras espera adicional');
      } else {
        conversation.logReceived(msgs);
      }

      if (AUTO_CANCEL_AFTER_INTENT) {
        conversation.logSent('cancelar');
        await typeIntoComposer(page, 'cancelar');
        await page.waitForTimeout(250).catch(() => {});
      }
      return msgs;
    };
    await use(fn);
  },
  cmds: async ({}, use) => { await use(CFG.cmds); },
  intents: async ({}, use) => { await use(INTENTS); },
  setVar: async ({}, use) => { await use((name, value) => setVar(name, value)); },
  withVars: async ({}, use) => { await use((vars) => withVars(vars)); },
  runAutoLoop: async ({ page, conversation }, use) => {
    const fn = async (starter: string, opts?: { resetChat?: boolean }) => {
      try {
        let toSend = starter;
        let retriedOnExists = false;
        const deadline = Date.now() + MAX_INTENT_MS;
        
  if (opts?.resetChat ?? true) await clearChat(page).catch(() => {}); 
  // Restablecer variables al inicio del intent para tener un baseline consistente
  resetVarsToDefaults();

        // Elegir un cultivo aleatorio distinto de "maíz" la mayoría de veces
        const chosen = pickRandomCrop();
        const prevCultivo = VARS.cultivo;
        setVar('cultivo', chosen.cultivo);
        // Si la variedad está por defecto o coincide con maíz, ajustar una variedad compatible
        if (!VARS.variedad || VARS.variedad.toLowerCase() === DEFAULT_VARS.variedad.toLowerCase()) {
          if (chosen.variedad) setVar('variedad', chosen.variedad);
        }

        // Reescribe el starter si contiene el cultivo por defecto para usar el elegido
        if (toSend && /maíz|maiz/i.test(toSend)) {
          toSend = toSend.replace(/maíz|maiz/gi, chosen.cultivo);
        }

        // Bucle sin límite de iteraciones: solo se corta por END_OK/END_ERR o timeout
        // (deadline de tiempo por intent)
        // Reintentos ilimitados de respuestas
        // -------------------------------------------------
        // Nota: mantenemos esperas y guardas para evitar spins vacíos
        while (true) {
          if (Date.now() > deadline) {
            conversation.logRecvFailure('Timeout por intent (tiempo excedido)');
            await finishIntent(page, conversation, true); // timeout
            return { success: false, reason: 'No response from bot after total intent timeout' };
          }
          const baseline = await countIncoming(page);

          if (toSend && toSend.trim()) {
            conversation.logSent(toSend);
            await typeIntoComposer(page, toSend);
          }

          let newMessages: string[] = [];
          const gotFirst = await waitFirstResponse(page, baseline, 45_000);
          if (!gotFirst) {
            await page.waitForTimeout(1500).catch(() => {});
            newMessages = await getNewIncomingAfter(page, baseline).catch(() => []);
            if (newMessages.length === 0) {
              conversation.logRecvFailure('Sin respuesta tras 45s');
              await finishIntent(page, conversation, true); // timeout = true
              return { success: false, reason: 'No response from bot after 45s timeout' };
            }
          } else {
            // Espera 5s adicionales tras el primer mensaje porque pueden venir más en la misma respuesta
            await page.waitForTimeout(5000).catch(() => {});
            newMessages = await getNewIncomingAfter(page, baseline).catch(() => []);
            if (newMessages.length === 0) {
              await page.waitForTimeout(2000).catch(() => {});
              newMessages = await getNewIncomingAfter(page, baseline).catch(() => []);
              if (newMessages.length === 0) {
                await page.waitForTimeout(1000).catch(() => {});
                newMessages = await getNewIncomingAfter(page, baseline).catch(() => []);
              }
            }
          }

          if (newMessages.length) conversation.logReceived(newMessages);
          else conversation.logRecvFailure('Sin mensajes');

          const action = detectActionFrom(newMessages);
          if (!action) { 
            toSend = ''; 
            continue; 
          }

          if (action.type === 'REPLY') {
            toSend = action.reply || '';
            continue;
          }

          if (action.type === 'RETRY_EXISTS') {
            if (!retriedOnExists) {
              retriedOnExists = true;
              mutateOneVariableForRetry();
              await finishIntent(page, conversation, false); // no timeout
              toSend = starter;
              continue;
            }
            await finishIntent(page, conversation, false); // no timeout
            return { success: false, reason: 'Flow ended with error' };
          }

          if (action.type === 'END_OK')  {
            await finishIntent(page, conversation, false); // no timeout
            return { success: true,  reason: 'Flow completed successfully' };
          }
          if (action.type === 'END_ERR') {
            await finishIntent(page, conversation, false); // no timeout
            return { success: false, reason: 'Flow ended with error' };
          }
        }
      } catch {
        conversation.logRecvFailure('Excepción durante el flujo');
        await finishIntent(page, conversation, false); // excepción no es timeout
        return { success: false, reason: 'Flow interrupted by page closure' };
      }
    };
    await use(fn);
  }
});

export { expect };
