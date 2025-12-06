/**
 * Script para corregir el JSON ordenado con las correcciones manuales
 */

import fs from 'fs';

const EXECUTION_ID = '496810a435e88506';

console.log('🔧 Aplicando correcciones manuales al JSON...\n');

// Leer JSON ordenado
const ordered = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}-ordenada.json`, 'utf8'));

// Correcciones a aplicar
const corrections = {
  // createChemicalProduct - marcar como FAIL
  fail: [48, 52, 68, 83, 129, 135, 138, 140, 144, 145, 148, 152, 154, 156, 157, 158, 159, 162, 164, 165, 166, 167, 169, 170, 171, 172],
  // getChemicalProductsByClient - marcar como OK
  ok: [418, 426, 427]
};

let failCount = 0;
let okCount = 0;

// Aplicar correcciones FAIL
corrections.fail.forEach(idx => {
  const entry = ordered.conversation[idx - 1];
  if (entry) {
    // Marcar todos los mensajes recibidos como fail
    entry.messages.forEach(msg => {
      if (msg.type === 'recv') {
        if (msg.ok !== false) {
          msg.ok = false;
          failCount++;
        }
      }
    });
    // Agregar flag de corrección manual
    entry.manualCorrection = 'fail';
    console.log(`[${idx}] ${entry.intent}: marcado como FAIL`);
  }
});

// Aplicar correcciones OK
corrections.ok.forEach(idx => {
  const entry = ordered.conversation[idx - 1];
  if (entry) {
    // Marcar todos los mensajes como ok
    entry.messages.forEach(msg => {
      if (msg.ok !== true) {
        msg.ok = true;
        okCount++;
      }
    });
    // Agregar flag de corrección manual
    entry.manualCorrection = 'ok';
    console.log(`[${idx}] ${entry.intent}: marcado como OK`);
  }
});

// Actualizar metadata
ordered.corrections = {
  appliedAt: new Date().toISOString(),
  failMarked: corrections.fail,
  okMarked: corrections.ok
};

// Guardar JSON corregido
fs.writeFileSync(`conversation-${EXECUTION_ID}-ordenada.json`, JSON.stringify(ordered, null, 2));

console.log(`\n${'='.repeat(50)}`);
console.log('CORRECCIONES APLICADAS');
console.log('='.repeat(50));
console.log(`   Frases marcadas como FAIL: ${corrections.fail.length}`);
console.log(`   Frases marcadas como OK: ${corrections.ok.length}`);
console.log(`   Mensajes modificados: ${failCount + okCount}`);
console.log(`\n✅ JSON actualizado: conversation-${EXECUTION_ID}-ordenada.json`);
