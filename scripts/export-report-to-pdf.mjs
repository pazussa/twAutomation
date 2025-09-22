#!/usr/bin/env node
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, dirname, extname, basename } from 'node:path';

const ROOT = resolve('.');
const DEFAULT_INPUT_DIR = resolve('test-results');
const OUT_ROOT = resolve('exports');

/** Recorrer directorio recursivo */
function walk(dir, filterFn) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, filterFn));
    else if (!filterFn || filterFn(p)) out.push(p);
  }
  return out;
}

/** Obtener inputs (args o búsqueda) */
function getInputHtmls() {
  const args = process.argv.slice(2).filter(Boolean);
  if (args.length) return args.map((a) => resolve(a)).filter((p) => existsSync(p) && extname(p).toLowerCase() === '.html');
  // Por defecto: buscar HTMLs en test-results y playwright-report
  const htmls = [
    ...walk(DEFAULT_INPUT_DIR, (p) => p.toLowerCase().endsWith('.html')),
    ...walk(resolve('playwright-report'), (p) => p.toLowerCase().endsWith('.html'))
  ];
  return htmls;
}

async function exportHtmlToPdf(browser, htmlPath) {
  const rel = relative(ROOT, htmlPath);
  const outDir = join(OUT_ROOT, dirname(rel));
  const outPdf = join(outDir, basename(htmlPath, extname(htmlPath)) + '.pdf');
  mkdirSync(outDir, { recursive: true });

  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.pdf({
    path: outPdf,
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' }
  });
  await page.close();
  console.log(`PDF generado: ${relative(ROOT, outPdf)}`);
}

(async () => {
  const inputs = getInputHtmls();
  if (!inputs.length) {
    console.error('No se encontraron archivos HTML para exportar.');
    console.error('Genera un reporte primero (p. ej. en test-results/conversations o playwright-report)');
    console.error('o pasa rutas explícitas: node scripts/export-report-to-pdf.mjs ruta/al/archivo.html');
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.error('No se pudo lanzar Chromium. Ejecuta: npm run playwright:install');
    throw e;
  }
  try {
    for (const html of inputs) {
      await exportHtmlToPdf(browser, html);
    }
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error('Fallo al exportar PDF:', err);
  process.exit(1);
});
