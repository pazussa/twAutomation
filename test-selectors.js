// Script temporal para verificar selectores de WhatsApp Web
import { chromium } from 'playwright';
import { homedir } from 'os';

(async () => {
  const context = await chromium.launchPersistentContext(
    homedir() + '/.wapp-autoloop-session',
    { headless: false }
  );
  
  const page = await context.newPage();
  await page.goto('https://web.whatsapp.com');
  
  console.log('Esperando 10 segundos para que cargue WhatsApp Web...');
  await page.waitForTimeout(10000);
  
  console.log('\n🔍 Probando selectores de mensajes entrantes:\n');
  
  const selectors = [
    'div.message-in',
    'div[data-id*="false"]',  // mensajes recibidos
    'div[data-id*="true"]',   // mensajes enviados
    '[class*="message-in"]',
    '[class*="msg-in"]',
    'div.copyable-text[data-pre-plain-text]',
    'span.selectable-text'
  ];
  
  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    console.log(`${sel.padEnd(50)} → ${count} elementos`);
  }
  
  console.log('\n✅ Prueba completada. Revisa los resultados arriba.');
  console.log('Presiona Ctrl+C para cerrar.');
  
  await page.waitForTimeout(60000); // Esperar 1 min
  await context.close();
})();
