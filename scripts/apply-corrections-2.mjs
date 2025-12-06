/**
 * Script para aplicar correcciones adicionales al JSON ordenado
 */

import fs from 'fs';

const EXECUTION_ID = '496810a435e88506';

console.log('🔧 Aplicando correcciones adicionales...\n');

// Leer JSON ordenado
const ordered = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}-ordenada.json`, 'utf8'));

// Correcciones a aplicar
const correctionsOk = [467, 468, 471, 472, 476, 486, 501, 504];

// 1. Marcar getCrops como OK
correctionsOk.forEach(idx => {
  const entry = ordered.conversation[idx - 1];
  if (entry) {
    entry.messages.forEach(msg => {
      msg.ok = true;
    });
    entry.manualCorrection = 'ok';
    console.log(`[${idx}] ${entry.intent}: marcado como OK`);
  }
});

// 2. Corrección especial para 545 (getFertilizers) - recortar conversación
const entry545 = ordered.conversation[544]; // índice 0-based
if (entry545) {
  console.log(`\n[545] ${entry545.intent}: recortando conversación...`);
  
  // Buscar el mensaje que contiene la frase de corte
  const cutPhrase = "Para María García, que cultiva arroz";
  let cutIndex = -1;
  
  for (let i = 0; i < entry545.messages.length; i++) {
    const msg = entry545.messages[i];
    if (msg.text && msg.text.includes(cutPhrase)) {
      cutIndex = i;
      break;
    }
  }
  
  if (cutIndex !== -1) {
    // Mantener solo hasta ese mensaje (inclusive)
    const originalCount = entry545.messages.length;
    entry545.messages = entry545.messages.slice(0, cutIndex + 1);
    
    // Marcar todos como OK
    entry545.messages.forEach(msg => {
      msg.ok = true;
    });
    
    entry545.manualCorrection = 'ok-truncated';
    console.log(`   Mensajes antes: ${originalCount}, después: ${entry545.messages.length}`);
    console.log(`   Último mensaje: "${entry545.messages[entry545.messages.length - 1].text.substring(0, 60)}..."`);
  } else {
    console.log(`   ⚠️ No se encontró la frase de corte`);
    // Mostrar los mensajes para debug
    entry545.messages.forEach((msg, i) => {
      if (msg.type === 'recv') {
        console.log(`   [${i}] ${msg.text.substring(0, 80)}...`);
      }
    });
  }
}

// Actualizar metadata de correcciones
if (!ordered.corrections) {
  ordered.corrections = { failMarked: [], okMarked: [] };
}
ordered.corrections.okMarked = [...new Set([...ordered.corrections.okMarked, ...correctionsOk, 545])];
ordered.corrections.appliedAt = new Date().toISOString();

// Guardar JSON corregido
fs.writeFileSync(`conversation-${EXECUTION_ID}-ordenada.json`, JSON.stringify(ordered, null, 2));

console.log(`\n${'='.repeat(50)}`);
console.log('CORRECCIONES APLICADAS');
console.log('='.repeat(50));
console.log(`   getCrops marcados como OK: ${correctionsOk.length} frases`);
console.log(`   getFertilizers [545]: recortado y marcado OK`);
console.log(`\n✅ JSON actualizado`);
