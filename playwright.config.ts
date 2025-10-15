import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 900_000, // Aumentado para permitir múltiples iteraciones
  expect: { timeout: 15_000 },
  // Para evitar colisiones en la misma sesión de WhatsApp:
  fullyParallel: false,
  workers: 1,
  // Reporter: lista en consola + HTML custom de conversación (pasos OK/FAIL)
  reporter: [
    ['list'],
    ['./tests/conversation-reporter.ts', { outputDir: 'test-results/conversations' }]
  ],
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    // Forzar modo headed (navegador visible)
    headless: false,
    viewport: { width: 1280, height: 720 },
  }
});
