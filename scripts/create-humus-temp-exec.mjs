/**
 * Script para crear temp-exec con frases de searchProductsFertilizers usando HUMUS DE LOMBRIZ
 */

import fs from 'fs';

const SEARCH_TERM = 'Humus de lombriz';
const CLIENT_NAME = 'Automatización Clnt';

// Templates de searchProductsFertilizers
const templates = [
  'busca {search_term}',
  'quiero buscar productos que contengan {search_term}',
  'encuentra {search_term} para el cliente {client_name}',
  'busca el fertilizante {search_term}',
  'necesito encontrar abono {search_term}',
  'muéstrame productos con {search_term}',
  'lista fertilizantes que tengan {search_term}',
  'buscar {search_term} en fertilizantes',
  '{search_term} fertilizantes',
  'fertilizantes con {search_term}',
  'productos fertilizantes {search_term}',
  'abonos que contengan {search_term}',
  'quiero ver {search_term} en la lista de fertilizantes',
  'mostrar {search_term} fertilizante',
  'encuentra abono {search_term}',
  'busca productos fertilizantes con {search_term}',
  '{search_term} para abonar',
  'necesito {search_term} para mis cultivos',
  'tienes {search_term} disponible',
  'hay {search_term} en stock',
  'consulta {search_term} en fertilizantes',
  'ver {search_term} disponible',
  'mostrar fertilizante {search_term}',
  'lista de {search_term}',
  'productos con {search_term} para {client_name}',
  'busca {search_term} para {client_name}'
];

function materialize(template) {
  return template
    .replace(/\{search_term\}/g, SEARCH_TERM)
    .replace(/\{client_name\}/g, CLIENT_NAME);
}

const examples = templates.map(t => ({
  intent: 'searchProductsFertilizers',
  example: materialize(t)
}));

const tempExec = {
  createdAt: new Date().toISOString(),
  intents: ['searchProductsFertilizers'],
  examples,
  purpose: 'Execute searchProductsFertilizers with HUMUS DE LOMBRIZ'
};

const newId = 'humus-' + Date.now().toString(16);
const filename = `temp-exec-${newId}.json`;

fs.writeFileSync(filename, JSON.stringify(tempExec, null, 2));

console.log(`✅ Creado: ${filename}`);
console.log(`   Total frases: ${examples.length}`);
console.log(`   Producto: ${SEARCH_TERM}`);
console.log('');
console.log('Primeras 5 frases:');
examples.slice(0, 5).forEach((e, i) => console.log(`   ${i+1}: ${e.example}`));
