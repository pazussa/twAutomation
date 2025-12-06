import fs from 'fs';
import path from 'path';

const EXECUTION_ID = '496810a435e88506';

// Leer todos los YML para obtener las frases esperadas (excepto requestOtp)
console.log('📖 Leyendo archivos YML...');

function camelCase(str) {
  return str.replace(/_([a-z])/g, (m, c) => c.toUpperCase());
}

const ymlDirs = ['tests/test2', 'tests/test3'];
const expectedByIntent = {};
let totalExpected = 0;

for (const dir of ymlDirs) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml') && f !== 'request_otp.yml');
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const intentName = camelCase(file.replace('.yml', ''));
    
    // Extraer frases (líneas que empiezan con "    - ")
    const phrases = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s{4}- (.+)/);
      if (match) {
        let phrase = match[1].trim();
        // Remover comillas si las tiene
        if ((phrase.startsWith('"') && phrase.endsWith('"')) || 
            (phrase.startsWith("'") && phrase.endsWith("'"))) {
          phrase = phrase.slice(1, -1);
        }
        phrases.push(phrase);
      }
    }
    
    expectedByIntent[intentName] = phrases;
    totalExpected += phrases.length;
  }
}

console.log(`✅ Total frases en YML (sin requestOtp): ${totalExpected}`);
console.log(`   Intents: ${Object.keys(expectedByIntent).length}`);

// Leer conversación actual
console.log('\n📖 Leyendo conversación...');
const conv = JSON.parse(fs.readFileSync(`conversation-${EXECUTION_ID}.json`, 'utf8'));
const executedPhrases = new Set();
const executedByIntent = {};

conv.events.filter(e => e.kind === 'intent').forEach(e => {
  const match = e.text.match(/\] (\w+) › (.+)/);
  if (match) {
    const intent = match[1];
    const phrase = match[2].trim();
    executedPhrases.add(phrase);
    
    if (!executedByIntent[intent]) executedByIntent[intent] = new Set();
    executedByIntent[intent].add(phrase);
  }
});

console.log(`✅ Frases únicas ejecutadas: ${executedPhrases.size}`);

// Analizar por intent
console.log('\n' + '='.repeat(70));
console.log('ANÁLISIS POR INTENT');
console.log('='.repeat(70));

const missing = [];
let totalMissing = 0;

Object.keys(expectedByIntent).sort().forEach(intent => {
  const expected = expectedByIntent[intent];
  const executed = executedByIntent[intent] || new Set();
  
  const missingInIntent = [];
  expected.forEach((phrase, idx) => {
    // Buscar la frase considerando que puede tener variables sustituidas
    let found = false;
    
    // Buscar coincidencia exacta primero
    if (executedPhrases.has(phrase)) {
      found = true;
    } else {
      // Buscar coincidencia con variables sustituidas
      // Las variables son {nombre} - reemplazarlas por regex
      const phrasePattern = phrase
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\{\\w+\\}/g, '.+');
      const regex = new RegExp(`^${phrasePattern}$`);
      
      for (const exec of executedPhrases) {
        if (regex.test(exec)) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      missingInIntent.push({ idx: idx + 1, phrase });
    }
  });
  
  const status = missingInIntent.length === 0 ? '✅' : '❌';
  console.log(`${status} ${intent}: ${expected.length - missingInIntent.length}/${expected.length}`);
  
  if (missingInIntent.length > 0) {
    totalMissing += missingInIntent.length;
    missingInIntent.forEach(m => {
      missing.push({ intent, localIdx: m.idx, phrase: m.phrase });
      if (missingInIntent.length <= 5) {
        console.log(`   [${m.idx}] ${m.phrase.substring(0, 55)}...`);
      }
    });
    if (missingInIntent.length > 5) {
      console.log(`   ... y ${missingInIntent.length - 5} más`);
    }
  }
});

console.log('\n' + '='.repeat(70));
console.log('RESUMEN');
console.log('='.repeat(70));
console.log(`Total frases en YML: ${totalExpected}`);
console.log(`Frases ejecutadas (únicas): ${executedPhrases.size}`);
console.log(`Frases faltantes: ${totalMissing}`);
console.log(`Cobertura: ${((totalExpected - totalMissing) / totalExpected * 100).toFixed(1)}%`);

if (missing.length > 0) {
  console.log('\n⚠️  FRASES FALTANTES:');
  missing.slice(0, 30).forEach((m, i) => {
    console.log(`${i+1}. ${m.intent} [${m.localIdx}]: ${m.phrase.substring(0, 50)}...`);
  });
  if (missing.length > 30) {
    console.log(`... y ${missing.length - 30} más`);
  }
}
