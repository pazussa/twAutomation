#!/usr/bin/env node
/**
 * Fusionar conversaciones para tener el historial completo
 */
import fs from 'fs';
import path from 'path';

const TRASH = '/home/user/Escritorio/tw/twAutomation/.trash';
const OUTPUT = '/home/user/Escritorio/tw/twAutomation/test-results/conversations';

// Conversación con 692 intents (la más completa antes de la última ejecución)
const oldConv = JSON.parse(fs.readFileSync(path.join(TRASH, '1764174163410-conversation-496810a435e88506.json'), 'utf8'));
// Conversación con 217 intents (la última ejecución)
const newConv = JSON.parse(fs.readFileSync(path.join(TRASH, '1764186429121-conversation-496810a435e88506.json'), 'utf8'));

console.log('📊 Conversación antigua:', oldConv.events.length, 'eventos,', 
  oldConv.events.filter(e => e.kind === 'intent').length, 'intents');
console.log('📊 Conversación nueva:', newConv.events.length, 'eventos,',
  newConv.events.filter(e => e.kind === 'intent').length, 'intents');

// Obtener el último índice de la conversación antigua
const oldIntents = oldConv.events.filter(e => e.kind === 'intent');
const lastOldIdx = oldIntents.length > 0 ? oldIntents[oldIntents.length - 1].meta?.idx : 0;
console.log('📍 Último índice en antigua:', lastOldIdx);

// Obtener el primer índice de la conversación nueva
const newIntents = newConv.events.filter(e => e.kind === 'intent');
const firstNewIdx = newIntents.length > 0 ? newIntents[0].meta?.idx : 0;
console.log('📍 Primer índice en nueva:', firstNewIdx);

// Fusionar: todos los eventos de la antigua + todos los eventos de la nueva
// (la nueva debería empezar desde donde terminó la antigua)
const mergedEvents = [...oldConv.events, ...newConv.events];

const merged = {
  ...oldConv,
  events: mergedEvents
};

const mergedIntents = mergedEvents.filter(e => e.kind === 'intent');
console.log('\n✅ Fusionado:', mergedEvents.length, 'eventos,', mergedIntents.length, 'intents');

// Verificar secuencia
const indices = mergedIntents.map(e => e.meta?.idx).filter(Boolean);
console.log('📍 Rango de índices:', Math.min(...indices), '-', Math.max(...indices));

// Guardar
const outputPath = path.join(OUTPUT, 'conversation-496810a435e88506.json');
fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
console.log('\n💾 Guardado en:', outputPath);
