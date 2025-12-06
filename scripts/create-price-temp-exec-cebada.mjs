/**
 * Script para crear temp-exec con frases de precio usando CEBADA
 */

import fs from 'fs';

// Templates de los 3 intents de precio
const INTENTS_TEMPLATES = {
  getLastPrice: [
    'Hola Luca, cuál es el último precio de {search_query}?',
    'Luca, dime el precio más reciente del {search_query}',
    'cuánto fue lo último que pagué por {search_query}?',
    'cuál fue el último precio registrado del {search_query}?',
    'dime el precio actualizado del {search_query}',
    'Luca, ¿cuánto costó por última vez el {search_query}?',
    'cuál es el precio más reciente que tengo del {search_query}?',
    'quiero saber el último valor de venta de {search_query}',
    'Luca, ¿a cómo estuvo el {search_query} en la última compra?',
    '¿A cómo he comprado la última vez {search_query}?',
    'Muéstrame el precio más reciente del producto {search_query}.',
    'Quiero consultar el valor actual de la {search_query}.',
    'Dime cuál es el coste registrado de {search_query}.',
    '¿Puedes mostrar el precio actualizado de {search_query}?',
    'Listar el último importe registrado para {search_query}.',
    'Ver el último coste anotado del {search_query}.',
    'Dime el precio reciente del producto {search_query}.',
    '¿Cuál es la última tarifa del {search_query}?',
    'Mostrar el importe más reciente registrado para {search_query}.',
    'Kiero ver a cuánto está actualmente la {search_query}.',
    '¿A qué valor tengo registrado el producto {search_query}?',
    'Dime el importe reciente que pagó {nombre_usuario_cliente} por {search_query}.',
    '¿Cuál es el precio actualizado de {search_query} para {nombre_usuario_cliente}?',
    'Muéstrame el valor más reciente de la {search_query} registrada por {nombre_usuario_cliente}.',
    'Consultar coste del {search_query} para {nombre_usuario_cliente}.',
    'Listar el importe registrado del producto {search_query} para {nombre_usuario_cliente}.',
    'Ver tarifa actual del {search_query} que tiene {nombre_usuario_cliente}.',
    '¿Qué valor tiene anotado {nombre_usuario_cliente} para el producto {search_query}?',
    'Dime el coste más reciente de {search_query} para {nombre_usuario_cliente}.',
    '¿Puedes mostrarme la tarifa actual del {search_query}?',
    'Listar precio reciente del producto {search_query} para mis parcelas.',
    'Muéstrame el importe registrado del {search_query} en mi cuenta.',
    'Consultar el coste actualizado de la {search_query}.',
    '¿A cuánto he comprado la última vez {search_query} en mis fincas?',
    'Ver precio reciente anotado para el producto {search_query}.',
    'Dime el valor actual que tengo del {search_query}.',
    'Listar tarifa más reciente para el producto {search_query}.',
    '¿Qué importe tengo registrado para {search_query}?',
    'Mostrar coste actualizado del {search_query}.',
    'Hola Luca, cuál es el último precio del {search_query} para el cliente {nombre_usuario_cliente}',
    'Hola Luca, cuál es el último precio del {search_query} para el cliente {nombre_usuario_cliente}',
    'Hola Luca, cuál es el último precio de {search_query} para el cliente {nombre_usuario_cliente}',
    'Hola Luca, cuál es el último precio de {search_query} para el cliente {nombre_usuario_cliente}'
  ],
  getMinPrice: [
    'Hola Luca, cuál es el precio mínimo del {search_query}?',
    'Luca, dime el valor más bajo que ha tenido el {search_query}',
    '¿A cómo ha estado el {search_query} en su punto más bajo?',
    '¿Cuál fue el precio mínimo del {search_query}?',
    'Luca, cuánto ha sido lo más barato que me ha costado el {search_query}?',
    'cuál es el menor precio registrado del {search_query}?',
    'Hola Luca, cuál es el precio mínimo del {search_query} para {client_name}?',
    'Luca, dime el valor más bajo que ha tenido el {search_query} para {client_name}',
    '¿A cómo ha estado el {search_query} en su punto más bajo para {client_name}?',
    'Para {client_name}, ¿cuál fue el precio mínimo del {search_query}?',
    'Luca, para el cliente {client_name} cuánto ha sido lo más barato del {search_query}?',
    'precio mínimo del {search_query} de {client_name}',
    '{client_name} precio mínimo {search_query}',
    'necesito saber el precio mínimo del {search_query} para {client_name}',
    'quiero consultar el mínimo del {search_query} para {client_name}',
    '{client_name} ¿cuál es el precio más bajo del {search_query}?',
    'Hola Luca, cuál es el precio mínimo del {search_query} para el cliente {client_name}?',
    '¿Podrías indicarme cuál ha sido el precio más económico de la {search_query}?',
    'Necesito información sobre el mínimo histórico del {search_query}',
    'En qué momento la {search_query} alcanzó su precio más bajo',
    'Consulta de precio mínimo para {search_query}',
    '¿Sabes cuál es el precio más económico al que se ha vendido el {search_query}?',
    'Para {client_name}, ¿cuál es el valor mínimo registrado del {search_query}?',
    'Dime el mejor precio que puedes ofrecerle a {client_name} para {search_query}',
    'Mínimo histórico de {search_query} para la cuenta de {client_name}',
    'El cliente {client_name} quiere saber el precio más bajo del {search_query}',
    '{client_name} solicita información sobre el mínimo del {search_query}',
    '¿A cuánto ha llegado a bajar el {search_query} para {client_name}?',
    'Luca, ¿cuál es el menor precio que ha tenido la {search_query} en nuestra base de datos?',
    '¿Me puedes decir a qué precio mínimo ha estado el {search_query} para {client_name}?',
    'Búscame el mínimo histórico del {search_query} para el cliente {client_name}',
    '{client_name} necesita saber cuándo estuvo más barato el {search_query}',
    'Hola Luca, cuál es el precio mínimo del {search_query} para {client_name}?',
    'Hola Luca, cuál es el precio mínimo del {search_query} para {client_name}?',
    'Hola Luca, cuál es el precio mínimo del {search_query} para {client_name}?',
    'Hola Luca, cuál es el precio mínimo del {search_query} para {client_name}?',
    'Hola Luca, cuál es el precio mínimo del {search_query} para {client_name}?'
  ],
  getPriceVariation: [
    'Hola Luca, cuál ha sido la variación del precio del {search_query}?',
    'Luca, dime cuánto ha variado el precio del {search_query}',
    '¿Qué tanta variación ha tenido el producto {search_query}?',
    'quiero saber si el precio del {search_query} ha subido o bajado',
    'cuánto ha cambiado el valor del {search_query} en los últimos años?',
    'Luca, ¿cuánto ha aumentado o disminuido el precio del {search_query}?',
    '¿Cuál ha sido el cambio reciente del precio del {search_query}?',
    'Muéstrame cómo ha evolucionado el precio de la {search_query}.',
    'Quiero consultar las variaciones recientes en el precio del {search_query}.',
    'Dime cómo ha fluctuado el precio del {search_query}.',
    '¿Puedes mostrarme la evolución del coste de {search_query}?',
    'Listar cambios de precio registrados para el producto {search_query}.',
    'Ver cómo ha cambiado últimamente el importe del {search_query}.',
    'Consultar el movimiento reciente en el valor del {search_query}.',
    'Muéstrame la tendencia del precio para {search_query}.',
    '¿Qué modificaciones ha tenido el precio del {search_query}?',
    'Mostrar evolución reciente del importe del {search_query}.',
    'Dime si ha habido variación en el coste de la {search_query}.',
    '¿Cómo ha fluctuado últimamente el precio del {search_query}?',
    'Consultar cambios recientes en la tarifa del {search_query}.',
    'Muéstrame la variación reciente del coste del {search_query}.',
    '¿Ha habido cambios últimamente en el valor de la {search_query}?',
    'Quiero ver cómo ha evolucionado el precio del {search_query}.',
    'Mostrar la fluctuación reciente en el precio del {search_query}.',
    'Kiero saber los movimientos del precio del {search_query}.',
    '¿Cuál es la tendencia del importe del producto {search_query}?',
    'Ver modificaciones recientes en el coste del {search_query}.',
    'Listar evolución del precio del {search_query} para {client_name}.',
    'Muéstrame cómo ha variado el precio de la {search_query} para {client_name}.',
    'Dime el cambio reciente en la tarifa de {search_query} registrada por {client_name}.',
    '¿Cuál ha sido la fluctuación del precio del producto {search_query} para {client_name}?',
    'Consultar evolución del importe del {search_query} asociado a {client_name}.',
    'Mostrar variaciones recientes del coste del {search_query} para {client_name}.',
    '¿Puedes decirme cómo ha cambiado el valor de {search_query} para {client_name}?',
    'Listar modificaciones recientes en el precio de la {search_query} registradas por {client_name}.',
    'Ver evolución del precio del {search_query} en la finca de {client_name}.',
    'Hola Luca, cuál ha sido la variación del precio del {search_query}?'
  ]
};

// Variables con CEBADA
const VARS = {
  search_query: 'Cebada',
  client_name: 'Automatización Clnt',
  nombre_usuario_cliente: 'Automatización Clnt'
};

function materialize(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

// Generar examples
const examples = [];

for (const [intent, templates] of Object.entries(INTENTS_TEMPLATES)) {
  for (const template of templates) {
    examples.push({
      intent,
      example: materialize(template, VARS)
    });
  }
}

const tempExec = {
  createdAt: new Date().toISOString(),
  intents: Object.keys(INTENTS_TEMPLATES),
  examples,
  purpose: 'Re-execute price intents with CEBADA'
};

const newId = 'price-cebada-' + Date.now().toString(16);
const filename = `temp-exec-${newId}.json`;

fs.writeFileSync(filename, JSON.stringify(tempExec, null, 2));

console.log(`✅ Creado: ${filename}`);
console.log(`   Total frases: ${examples.length}`);
console.log(`   Producto: CEBADA`);
console.log('');
console.log('Por intent:');
for (const intent of Object.keys(INTENTS_TEMPLATES)) {
  const count = examples.filter(e => e.intent === intent).length;
  console.log(`   ${intent}: ${count}`);
}
