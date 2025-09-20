# AutoLoop Twilio con Playwright (TypeScript)

Proyecto mínimo que automatiza una conversación en WhatsApp Web con el contacto "Twilio" (sandbox), usando Playwright + TypeScript.

## Requisitos
- Node.js 18+
- Linux/macOS/Windows (en Linux puede requerir librerías extras de Playwright)

## Instalación
```bash
npm install
npm run playwright:install
cp .env.example .env
# Ajusta variables en .env si hace falta
```

## Ejecutar en modo desarrollo (TS directo)
```bash
npm run dev
```

## Construir y ejecutar JS compilado
```bash
npm run build
npm start
```

### ¿Qué hace?
1) Abre sesión persistente en WhatsApp Web.
2) Abre el chat Twilio y limpia el historial.
3) Toma un mensaje inicial aleatorio del dataset y lo envía.
4) En bucle: envía, espera la primera respuesta, espera 3s, lee los mensajes nuevos, detecta palabras clave y responde según reglas.
5) Finaliza con **OK** o **ERROR** según palabras clave detectadas.

### Datasets
- **Mensajes de inicio**: lista de frases iniciales.
- **Reglas de palabras clave**: mapeos de regex a acción (responder, terminar OK, terminar ERROR).

Edita estas listas dentro de `src/autoLoop.ts` (bloques `STARTERS` y `KEYWORD_RULES`).