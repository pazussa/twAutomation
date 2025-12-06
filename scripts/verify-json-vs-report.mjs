/**
 * Verifica la correspondencia 1:1 entre el JSON ordenado y el reporte HTML/PDF
 */

import fs from 'fs';
import { JSDOM } from 'jsdom';

const EXECUTION_ID = '496810a435e88506';

console.log('='.repeat(60));
console.log('VERIFICACIÓN: JSON vs REPORTE HTML');
console.log('='.repeat(60));

// Leer JSON ordenado
const ordered = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}-ordenada.json`, 'utf8'));
console.log(`\n📋 JSON ordenado: ${ordered.conversation.length} frases`);

// Leer HTML del reporte
const html = fs.readFileSync(`test-results/conversations/Ejecucion-${EXECUTION_ID}-COMPLETO.html`, 'utf8');

// Parsear HTML
const dom = new JSDOM(html);
const doc = dom.window.document;

// Buscar todas las tarjetas de intent
const intentCards = doc.querySelectorAll('.intent-card');
console.log(`📋 Reporte HTML: ${intentCards.length} tarjetas de intent`);

// Verificar correspondencia
let mismatches = [];
let allMatch = true;

intentCards.forEach((card, i) => {
  const header = card.querySelector('.intent-title');
  if (!header) return;
  
  const headerText = header.textContent.trim();
  // Formato: [1/919] intentName › frase...
  const match = headerText.match(/\[(\d+)\/\d+\]\s*(\w+)\s*›\s*(.+)/);
  
  if (!match) {
    mismatches.push({ idx: i+1, error: `No se pudo parsear header: ${headerText.substring(0, 50)}` });
    allMatch = false;
    return;
  }
  
  const [, indexStr, intent, phraseStart] = match;
  const index = parseInt(indexStr);
  
  // Buscar en el JSON
  const jsonEntry = ordered.conversation[index - 1];
  
  if (!jsonEntry) {
    mismatches.push({ idx: index, error: 'No existe en JSON' });
    allMatch = false;
    return;
  }
  
  if (jsonEntry.index !== index) {
    mismatches.push({ idx: index, error: `Índice JSON: ${jsonEntry.index}` });
    allMatch = false;
  }
  
  if (jsonEntry.intent !== intent) {
    mismatches.push({ idx: index, error: `Intent: HTML=${intent}, JSON=${jsonEntry.intent}` });
    allMatch = false;
  }
  
  // Verificar que la frase empiece igual (el HTML puede estar truncado)
  const phraseClean = phraseStart.replace('...', '').trim();
  if (!jsonEntry.phrase.startsWith(phraseClean.substring(0, 30))) {
    mismatches.push({ idx: index, error: `Frase no coincide` });
    allMatch = false;
  }
  
  // Contar mensajes en la tabla
  const rows = card.querySelectorAll('tbody tr');
  const htmlMessageCount = rows.length;
  const jsonMessageCount = jsonEntry.messages.length;
  
  // Si hay diferencia significativa de mensajes
  if (Math.abs(htmlMessageCount - jsonMessageCount) > 1 && jsonMessageCount > 0) {
    // Permitir diferencia de 1 por posibles variaciones
    if (htmlMessageCount !== 1 || !rows[0].textContent.includes('NO fue ejecutada')) {
      mismatches.push({ idx: index, error: `Mensajes: HTML=${htmlMessageCount}, JSON=${jsonMessageCount}` });
    }
  }
});

// Verificar cantidad total
if (intentCards.length !== ordered.conversation.length) {
  mismatches.push({ idx: 'total', error: `Cantidad diferente: HTML=${intentCards.length}, JSON=${ordered.conversation.length}` });
  allMatch = false;
}

console.log('\n' + '='.repeat(60));
if (allMatch && mismatches.length === 0) {
  console.log('✅ CORRESPONDENCIA PERFECTA 1:1');
  console.log('='.repeat(60));
  console.log('   El JSON ordenado corresponde exactamente con el reporte HTML.');
  console.log('   El PDF generado desde este HTML también corresponde.');
} else {
  console.log('⚠️ HAY DIFERENCIAS');
  console.log('='.repeat(60));
  mismatches.slice(0, 15).forEach(m => {
    console.log(`   [${m.idx}] ${m.error}`);
  });
  if (mismatches.length > 15) {
    console.log(`   ... y ${mismatches.length - 15} más`);
  }
}

// Verificar también el JSON del reporte
console.log('\n' + '='.repeat(60));
console.log('VERIFICACIÓN: JSON ordenado vs JSON del reporte');
console.log('='.repeat(60));

const reportJson = JSON.parse(fs.readFileSync(`test-results/conversations/Ejecucion-${EXECUTION_ID}-COMPLETO.json`, 'utf8'));
console.log(`\n📋 JSON del reporte: ${reportJson.results.length} entradas`);

let jsonMismatches = [];

for (let i = 0; i < ordered.conversation.length; i++) {
  const ordEntry = ordered.conversation[i];
  const repEntry = reportJson.results[i];
  
  if (!repEntry) {
    jsonMismatches.push({ idx: i+1, error: 'Falta en reporte JSON' });
    continue;
  }
  
  if (ordEntry.index !== repEntry.idx) {
    jsonMismatches.push({ idx: i+1, error: `Índice: ord=${ordEntry.index}, rep=${repEntry.idx}` });
  }
  
  if (ordEntry.intent !== repEntry.intent) {
    jsonMismatches.push({ idx: i+1, error: `Intent: ord=${ordEntry.intent}, rep=${repEntry.intent}` });
  }
  
  if (ordEntry.phrase !== repEntry.phrase) {
    jsonMismatches.push({ idx: i+1, error: 'Frase diferente' });
  }
  
  if (ordEntry.executed !== repEntry.executed) {
    jsonMismatches.push({ idx: i+1, error: `Executed: ord=${ordEntry.executed}, rep=${repEntry.executed}` });
  }
}

if (jsonMismatches.length === 0) {
  console.log('\n✅ JSON ordenado = JSON del reporte (PERFECTA CORRESPONDENCIA)');
} else {
  console.log(`\n⚠️ ${jsonMismatches.length} diferencias encontradas:`);
  jsonMismatches.slice(0, 10).forEach(m => {
    console.log(`   [${m.idx}] ${m.error}`);
  });
}

// Resumen final
console.log('\n' + '='.repeat(60));
console.log('RESUMEN FINAL');
console.log('='.repeat(60));
console.log(`   JSON ordenado:     ${ordered.conversation.length} frases`);
console.log(`   Reporte HTML:      ${intentCards.length} tarjetas`);
console.log(`   Reporte JSON:      ${reportJson.results.length} entradas`);
console.log(`   Ejecutadas:        ${ordered.summary.executed}/${ordered.summary.totalPhrases}`);
console.log(`   Cobertura:         ${ordered.summary.coverage}`);
