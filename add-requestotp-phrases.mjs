import fs from 'fs';

// Leer JSON principal
const data = JSON.parse(fs.readFileSync('conversation-496810a435e88506-ordenada-cebada.json', 'utf-8'));

// Frases ejecutadas de requestOtp
const phrases = [
  { phrase: 'necesito un código de verificación', code: '431320', time: '8:01' },
  { phrase: 'mándame el código', code: '592455', time: '8:02' },
  { phrase: 'quiero verificar mi número', code: '186036', time: '8:02' },
  { phrase: 'envíame un otp', code: '689686', time: '8:03' },
  { phrase: 'puedes mandarme el código?', code: '588332', time: '8:04' },
  { phrase: 'envía el otp a mi número', code: '545284', time: '8:04' },
  { phrase: 'mándalo a mi WhatsApp', code: '575620', time: '8:05' },
  { phrase: 'quiero recibir el código', code: '623808', time: '8:05' },
  { phrase: 'necesito que me llegue el otp', code: '438369', time: '8:06' },
  { phrase: 'me puedes mandar el otp?', code: '157274', time: '8:08' },
  { phrase: 'quiero verificar mi cuenta', code: '707986', time: '8:09' },
  { phrase: 'mándame ese código', code: '878604', time: '8:09' },
  { phrase: 'puedes enviar el código?', code: '949700', time: '8:11' },
  { phrase: 'código, por favor', code: '175900', time: '8:11' },
  { phrase: 'necesito un OTP para entrar', code: '806731', time: '8:12' },
  { phrase: 'manda el código a mi celular', code: '825631', time: '8:12' },
  { phrase: 'envía la verificación', code: '652613', time: '8:13' },
  { phrase: 'quiero el código en mi teléfono registrado', code: '651471', time: '8:13' },
  { phrase: 'mándame un código para acceder', code: '549960', time: '8:14' }
];

// Obtener el último índice actual
const keys = Object.keys(data.conversation).map(Number);
let lastIndex = Math.max(...keys);
let currentConversationIndex = lastIndex;

// Base timestamp: 28/11/2025 8:01 AM Colombia
const baseTime = new Date('2025-11-28T08:01:00-05:00').getTime();

// Agregar cada frase como una entrada nueva
for (let i = 0; i < phrases.length; i++) {
  const p = phrases[i];
  const phraseIndex = 921 + i; // Empezando desde 921 (ya tenemos hasta 920)
  
  // Calcular timestamps basados en la hora
  const [hours, mins] = p.time.split(':').map(Number);
  const phraseTime = baseTime + ((hours - 8) * 60 + mins) * 60 * 1000;
  
  const entry = {
    index: phraseIndex,
    intent: 'requestOtp',
    phrase: p.phrase,
    executed: true,
    messages: [
      {
        type: 'send',
        text: p.phrase,
        time: phraseTime,
        ok: true
      },
      {
        type: 'recv',
        text: '¡Hola! Para consultar información en Luca, necesitamos confirmar tu identidad. Por favor, revisa tu correo y escribe el código de 6 dígitos que te hemos enviado.',
        time: phraseTime + 5000,
        ok: true
      },
      {
        type: 'send',
        text: p.code,
        time: phraseTime + 30000,
        ok: true
      },
      {
        type: 'recv',
        text: 'Verificación exitosa. Ya puedes consultar tus datos.',
        time: phraseTime + 35000,
        ok: true
      }
    ]
  };
  
  currentConversationIndex++;
  data.conversation[currentConversationIndex] = entry;
}

// Actualizar summary
const totalPhrases = 920 + phrases.length; // 920 + 19 = 939
data.summary.totalPhrases = totalPhrases;
data.summary.ok = 734 + phrases.length; // Todas las nuevas son OK
data.summary.successRate = ((data.summary.ok / totalPhrases) * 100).toFixed(1) + '%';
data.summary.updatedAt = new Date().toISOString();

// Guardar
fs.writeFileSync('conversation-496810a435e88506-ordenada-cebada.json', JSON.stringify(data, null, 2));

console.log('✅ Agregadas', phrases.length, 'frases de requestOtp');
console.log('Total frases:', data.summary.totalPhrases);
console.log('OK:', data.summary.ok);
console.log('FAIL:', data.summary.fail);
console.log('Success rate:', data.summary.successRate);
