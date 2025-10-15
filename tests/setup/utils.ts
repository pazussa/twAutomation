import type { Page, Locator } from 'playwright';

// String templating helpers
export function materialize(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}
export function materializeAll(list: ReadonlyArray<string>, vars: Record<string, string>): string[] {
  return list.map((t) => materialize(t, vars));
}

// WhatsApp Web selectors and variants
export const SELECTORS = {
  appReady: "[data-testid='pane-side'],[data-testid='chat-list'],[aria-label='Lista de chats'],[role='grid']",
  qrAny: "canvas[aria-label*='QR'],img[alt*='QR'],[data-testid='qr-code'],canvas[aria-label*=QR]",
  composer: "footer div[contenteditable='true'], div[contenteditable='true'][role='textbox']",
  messageIn: 'div.message-in',
  chatListItems: "[data-testid='chat-list'] [data-testid*='cell-frame']"
} as const;

export const TWILIO_VARIANTS = (name: string) => [
  name,
  'Twilio',
  '+1 (415) 523-8886',
  '+14155238886',
  '415 523-8886',
  '4155238886'
];

export function locator(page: Page, sel: keyof typeof SELECTORS): Locator {
  return page.locator(SELECTORS[sel]);
}

export async function ensureLogin(page: Page, totalTimeout = 180_000) {
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

export async function openChat(page: Page, name: string) {
  await page.waitForSelector(SELECTORS.appReady, { timeout: 30_000 });
  
  console.log('[openChat] Esperando a que se carguen los chats...');
  
  // Esperar hasta encontrar el contacto Twilio con reintentos
  const maxAttempts = 20; // 20 intentos = hasta 60 segundos
  let attempt = 0;
  let chatFound = false;
  
  while (attempt < maxAttempts && !chatFound) {
    attempt++;
    console.log(`[openChat] Intento ${attempt}/${maxAttempts} buscando contacto...`);
    
    // Intentar encontrar Twilio con todas sus variantes DIRECTAMENTE
    for (const variant of TWILIO_VARIANTS(name)) {
      const chatItem = page.locator(`span[title='${variant}']`).first();
      const isVisible = await chatItem.isVisible().catch(() => false);
      
      if (isVisible) {
        console.log(`[openChat] ✓ Encontrado chat con variante: ${variant}`);
        await chatItem.click();
        await page.waitForSelector(SELECTORS.composer, { timeout: 10_000 });
        chatFound = true;
        return;
      } else {
        console.log(`[openChat] Variante "${variant}" no visible aún`);
      }
    }
    
    if (!chatFound) {
      console.log('[openChat] Twilio no encontrado aún, esperando 3 segundos...');
      await page.waitForTimeout(3000);
    }
  }
  
  if (!chatFound) {
    // Fallback: abrir el primer chat disponible
    console.log('[openChat] ⚠ No se encontró Twilio después de todos los intentos, intentando fallback...');
    
    // Intentar con el selector de lista de chats
    try {
      const chatItems = page.locator(SELECTORS.chatListItems);
      const count = await chatItems.count();
      if (count > 0) {
        console.log(`[openChat] Encontrados ${count} chats en la lista, abriendo el primero`);
        await chatItems.first().click();
        await page.waitForSelector(SELECTORS.composer, { timeout: 10_000 });
        return;
      }
    } catch (e) {
      console.log('[openChat] Fallback también falló:', e);
    }
    
    throw new Error('No se pudo abrir ningún chat después de esperar');
  }
}

export async function clearChat(page: Page) {
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

export async function typeIntoComposer(page: Page, text: string) {
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

export async function countIncoming(page: Page): Promise<number> {
  return locator(page, 'messageIn').count();
}

export function sanitizeMessage(text: string): string {
  if (!text) return text;
  let out = text;
  try { out = out.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ''); } catch {}
  const timePattern = /\b\d{1,2}:\d{2}\s*[\u00A0\s]?(?:a\.m\.|p\.m\.|a\.?\s*m\.?|p\.?\s*m\.?|AM|PM|am|pm)\.?\b/gi;
  out = out.replace(timePattern, '');
  out = out.replace(/\s*\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm|a\.m\.|p\.m\.|a\.?\s*m\.?|p\.?\s*m\.? )\.?\s*$/gi, '');
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
  return out;
}

export async function extractBubbleText(el: Locator): Promise<string> {
  try {
    const spans = await el.locator("span.selectable-text span, span.selectable-text, span[dir='auto'], div[dir='auto']").all();
    const parts: string[] = [];
    for (const sp of spans) {
      try { const t = (await sp.innerText({ timeout: 1200 })).trim(); if (t && !parts.includes(t)) parts.push(t); } catch {}
    }
    return sanitizeMessage(parts.join(' ').trim());
  } catch { return ''; }
}

export async function getNewIncomingAfter(page: Page, baseline: number): Promise<string[]> {
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

export async function waitFirstResponse(page: Page, baseline: number, timeoutMs = 45_000): Promise<boolean> {
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
