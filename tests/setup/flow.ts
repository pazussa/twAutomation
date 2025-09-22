import 'dotenv/config';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { test as base, expect } from '@playwright/test';
import { ensureLogin, openChat, clearChat, typeIntoComposer, countIncoming, getNewIncomingAfter, waitFirstResponse } from './utils';
import { CFG, INTENTS, VARS, DEFAULT_VARS, setVar, withVars, pickRandomCrop, mutateOneVariableForRetry } from './data';

export type ConvKind = 'send' | 'recv' | 'intent';
export type ConversationLogger = {
  logSent: (text: string) => void;
  logReceived: (texts: string[]) => void;
  logRecvFailure: (reason: string) => void;
  logIntent: (label: string, idx?: number, total?: number) => void;
};

const AUTO_CANCEL_AFTER_INTENT = true;
const MAX_INTENT_MS = Number.POSITIVE_INFINITY;

async function finishIntent(page: Page, conversation: ConversationLogger, isTimeout: boolean = false) {
  if (isTimeout && AUTO_CANCEL_AFTER_INTENT) {
    conversation.logSent('cancelar');
    await typeIntoComposer(page, 'cancelar');
    await page.waitForTimeout(500).catch(() => {});
  }
  await clearChat(page).catch(() => {});
}

export type Action =
  | { type: 'REPLY'; reply: string }
  | { type: 'END_OK' }
  | { type: 'END_ERR' }
  | { type: 'RETRY_EXISTS' };

import { KEYWORD_RULES, extractFirstOption } from './data';
import { materialize } from './utils';
import { resetVarsToDefaults } from './data';

function detectActionFrom(messages: string[]): Action | null {
  const joined = messages.join('\n');
  if (/Opciones:/i.test(joined)) {
    const first = extractFirstOption(joined);
    return { type: 'REPLY', reply: first || '1' };
  }
  if (/ya existe/i.test(joined)) return { type: 'RETRY_EXISTS' };
  for (const rule of KEYWORD_RULES) {
    if (rule.action.type !== 'REPLY' && rule.pattern.test(joined)) return rule.action;
  }
  for (const msg of messages) {
    for (const rule of KEYWORD_RULES) {
      if (rule.action.type === 'REPLY' && rule.pattern.test(msg)) {
        return { type: 'REPLY', reply: materialize(rule.action.reply, VARS) };
      }
    }
  }
  return null;
}

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
    await clearChat(page).catch(() => {});
    await use(page);
  },
  conversation: async ({}, use, testInfo) => {
    const events: Array<{ t: number; kind: ConvKind; text: string; ok: boolean; meta?: any }> = [];
    const logger: ConversationLogger = {
      logSent: (text) => { console.log(`Enviado: ${text}`); events.push({ t: Date.now(), kind: 'send', text, ok: true }); },
      logReceived: (texts) => { texts.forEach((text) => { console.log(`Recibido: ${text}`); events.push({ t: Date.now(), kind: 'recv', text, ok: true }); }); },
      logRecvFailure: (reason) => { console.log(`Error: ${reason}`); events.push({ t: Date.now(), kind: 'recv', text: reason, ok: false }); },
      logIntent: (label, idx, total) => { console.log(`\n[${idx}/${total}] ${label}`); events.push({ t: Date.now(), kind: 'intent', text: label, ok: true, meta: { idx, total } }); }
    };
    await use(logger);
    await testInfo.attach('conversation', {
      contentType: 'application/json',
      body: JSON.stringify({ title: testInfo.title, events }, null, 2)
    });
  },
  resetChat: async ({ page }, use) => { await use(async () => { await clearChat(page).catch(() => {}); }); },
  sendAndWait: async ({ page, conversation }, use) => {
    const fn = async (message: string, extraWaitMs = 5000) => {
      const baseline = await countIncoming(page);
      conversation.logSent(message);
      await typeIntoComposer(page, message);
      let gotFirst = await waitFirstResponse(page, baseline, 45_000);
      if (!gotFirst) {
        await page.waitForTimeout(1500).catch(() => {});
        const fallbackMsgs = await getNewIncomingAfter(page, baseline);
        if (fallbackMsgs.length > 0) conversation.logReceived(fallbackMsgs);
        else conversation.logRecvFailure('No hubo primera respuesta tras 45s');
      }
      await page.waitForTimeout(extraWaitMs);
      let msgs = await getNewIncomingAfter(page, baseline);
      if (msgs.length === 0) {
        await page.waitForTimeout(2000).catch(() => {});
        msgs = await getNewIncomingAfter(page, baseline);
      }
      if (msgs.length === 0) conversation.logRecvFailure('Sin mensajes nuevos tras espera adicional');
      else conversation.logReceived(msgs);
      if (true) { // AUTO_CANCEL_AFTER_INTENT
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
        const checkpoints = (process.env.DEBUG_CHECKPOINTS || '').split(',').map(s => s.trim()).filter(Boolean);
        const pauseIf = async (name: string) => {
          if (checkpoints.includes(name)) {
            console.log(`[debug] checkpoint: ${name} — pausa interactiva`);
            // eslint-disable-next-line no-debugger
            debugger;
          }
        };
        if (opts?.resetChat ?? true) await clearChat(page).catch(() => {});
        resetVarsToDefaults();
        const chosen = pickRandomCrop();
        setVar('cultivo', chosen.cultivo);
        if (!VARS.variedad || VARS.variedad.toLowerCase() === DEFAULT_VARS.variedad.toLowerCase()) {
          if (chosen.variedad) setVar('variedad', chosen.variedad);
        }
        if (toSend && /maíz|maiz/i.test(toSend)) toSend = toSend.replace(/maíz|maiz/gi, chosen.cultivo);
        await pauseIf('before-first-send');
        while (true) {
          if (Date.now() > deadline) { conversation.logRecvFailure('Timeout por intent (tiempo excedido)'); await finishIntent(page, conversation, true); return { success: false, reason: 'No response from bot after total intent timeout' }; }
          const baseline = await countIncoming(page);
          if (toSend && toSend.trim()) { conversation.logSent(toSend); await typeIntoComposer(page, toSend); }
          await pauseIf('after-send');
          let newMessages: string[] = [];
          const gotFirst = await waitFirstResponse(page, baseline, 45_000);
          await pauseIf('after-first-wait');
          if (!gotFirst) {
            await page.waitForTimeout(1500).catch(() => {});
            newMessages = await getNewIncomingAfter(page, baseline).catch(() => []);
            if (newMessages.length === 0) { conversation.logRecvFailure('Sin respuesta tras 45s'); await finishIntent(page, conversation, true); return { success: false, reason: 'No response from bot after 45s timeout' }; }
          } else {
            await page.waitForTimeout(5000).catch(() => {});
            newMessages = await getNewIncomingAfter(page, baseline).catch(() => []);
            if (newMessages.length === 0) {
              await page.waitForTimeout(2000).catch(() => {});
              newMessages = await getNewIncomingAfter(page, baseline).catch(() => []);
              if (newMessages.length === 0) { await page.waitForTimeout(1000).catch(() => {}); newMessages = await getNewIncomingAfter(page, baseline).catch(() => []); }
            }
          }
          await pauseIf('after-aggregate');
          if (newMessages.length) conversation.logReceived(newMessages); else conversation.logRecvFailure('Sin mensajes');
          const action = detectActionFrom(newMessages);
          await pauseIf('after-detect');
          if (!action) { toSend = ''; continue; }
          if (action.type === 'REPLY') { toSend = action.reply || ''; continue; }
          if (action.type === 'RETRY_EXISTS') {
            if (!retriedOnExists) { retriedOnExists = true; mutateOneVariableForRetry(); await finishIntent(page, conversation, false); toSend = starter; continue; }
            await finishIntent(page, conversation, false); return { success: false, reason: 'Flow ended with error' };
          }
          if (action.type === 'END_OK')  { await finishIntent(page, conversation, false); return { success: true,  reason: 'Flow completed successfully' }; }
          if (action.type === 'END_ERR') { await finishIntent(page, conversation, false); return { success: false, reason: 'Flow ended with error' }; }
        }
      } catch {
        conversation.logRecvFailure('Excepción durante el flujo');
        await finishIntent(page, conversation, false);
        return { success: false, reason: 'Flow interrupted by page closure' };
      }
    };
    await use(fn);
  }
});

export { expect };
