# Automatización WhatsApp con Playwright

Proyecto de automatización para probar conversaciones WhatsApp usando Playwright con TypeScript. Diseñado para validar flujos conversacionales de un bot agrícola mediante múltiples intents y respuestas automatizadas.

## Requisitos
- Node.js 18+
- WhatsApp Web accesible
- Cuenta de Twilio Sandbox para WhatsApp

## Instalación
```bash
npm install
npm run playwright:install
cp .env.example .env
# Configura las variables en .env según tu entorno
```

## Configuración inicial

### 1. Configurar Twilio Sandbox
Antes de ejecutar las pruebas, debes unirte al sandbox de Twilio:

1. Envía un mensaje WhatsApp a **+1 (415) 523-8886**
2. El mensaje debe ser: `join [nombre-del-sandbox]`
3. Ejemplo: `join weather-assistant` 
4. Espera la confirmación de que te has unido al sandbox

### 2. Variables de entorno
Edita `.env` con tus configuraciones:
```bash
CONTACT_NAME=Twilio
HEADLESS=false
SESSION_DIR=~/.wapp-autoloop-session
# Configura otros comandos y variables según necesites
```

## Ejecutar pruebas

### Ejecutar todas las pruebas
```bash
npm run pw
```

### Ejecutar una prueba específica
```bash
npx playwright test tests/crear_cultivo.spec.ts
```

### Modo debug (con navegador visible)
```bash
HEADLESS=false npm run pw
```

### Debug con checkpoints específicos
```bash
DEBUG_CHECKPOINTS=before-first-send,after-detect npm run pw
```

Checkpoints disponibles:
- `before-first-send`: Antes del primer mensaje
- `after-send`: Después de enviar mensaje
- `after-first-wait`: Después de esperar primera respuesta  
- `after-aggregate`: Después de recopilar mensajes
- `after-detect`: Después de detectar acción

## Generar reportes

### Reportes HTML de conversación
Los reportes se generan automáticamente en `test-results/conversations/` después de cada ejecución.

### Exportar reportes a PDF
```bash
npm run report:pdf
```
Los PDFs se guardan en `exports/test-results/conversations/`

### Exportar archivo HTML específico
```bash
node scripts/export-report-to-pdf.mjs ruta/al/archivo.html
```

## Estructura del proyecto

```
tests/
├── setup/
│   ├── utils.ts      # Utilidades WhatsApp Web y helpers
│   ├── data.ts       # Configuración, variables, intents y reglas
│   └── flow.ts       # Fixtures Playwright y flujo principal
├── _setup.ts         # Re-exporta desde setup/flow
├── *.spec.ts         # Tests por cada funcionalidad
└── conversation-reporter.ts  # Reporter personalizado

.vscode/
├── launch.json       # Configuraciones debug VS Code
└── tasks.json        # Tareas VS Code

scripts/
└── export-report-to-pdf.mjs  # Exportador PDF
```

## Agregar nuevos intents

### 1. Editar `tests/setup/data.ts`
Busca `INTENTS_TEMPLATES` y añade tu nueva categoría:

```typescript
const INTENTS_TEMPLATES = {
  // ... intents existentes
  miNuevoIntent: [
    'frase simple',
    'frase con {variable}',
    'otra variación con {cliente} y {cultivo}'
  ]
} as const;
```

### 2. Agregar variables si es necesario
En `VARS` define las variables que uses:
```typescript
const VARS: Record<string, string> = {
  // ... variables existentes
  miVariable: process.env.VAR_MI_VARIABLE || 'valor-por-defecto'
};
```

### 3. Configurar reglas de detección
En `KEYWORD_RULES` añade patrones para detectar respuestas:
```typescript
const KEYWORD_RULES = [
  // ... reglas existentes
  { pattern: /mi nuevo patrón exitoso/i, action: { type: 'END_OK' }, note: 'Mi nuevo intent exitoso' },
  { pattern: /^Mi campo requerido\.?$/i, action: { type: 'REPLY', reply: '{miVariable}' }, note: 'Pide mi variable' }
];
```

### 4. Crear spec de prueba
Crea `tests/mi_nuevo_intent.spec.ts`:
```typescript
import { test, expect } from './_setup';

test('Mi nuevo intent - Todos los intents', async ({ runAutoLoop, intents, conversation }) => {
  const fails: string[] = [];
  const list = intents.miNuevoIntent;
  
  for (let i = 0; i < list.length; i++) {
    const starter = list[i];
    conversation.logIntent(`[${i + 1}/${list.length}] ${starter}`, i + 1, list.length);
    
    const result = await runAutoLoop(starter, { resetChat: true });
    if (!result.success) {
      fails.push(`Intent "${starter}" falló: ${result.reason}`);
    }
  }
  
  expect.soft(fails, fails.join('\\n')).toHaveLength(0);
});
```

## Debugging en VS Code

1. Abre VS Code en el proyecto
2. Ve a "Run and Debug" (Ctrl+Shift+D)
3. Selecciona una configuración:
   - **Debug: Current file**: Depura el spec actual abierto
   - **Debug: By title**: Define `TEST_NAME` con el título del test
   - **Debug: All tests**: Ejecuta todos los tests en modo debug

### Breakpoints con checkpoints
Define `DEBUG_CHECKPOINTS` en la configuración del launch para pausar en puntos específicos del flujo conversacional.

## Cómo funciona

### Flujo principal
1. **Inicialización**: Limpia chat, resetea variables, selecciona cultivo aleatorio
2. **Envío**: Envía mensaje y espera primera respuesta (45s timeout)
3. **Agregación**: Espera 5s adicionales para recopilar mensajes múltiples
4. **Detección**: Analiza mensajes con reglas regex para decidir acción
5. **Acción**: REPLY (responder), END_OK (éxito), END_ERR (error), RETRY_EXISTS (reintentar con variables mutadas)

### Variables dinámicas
- Los cultivos se seleccionan aleatoriamente de `CROPS_POOL`
- Las marcas se mutan automáticamente en reintentos "ya existe"
- El `destino` permanece fijo como "consumo" o "pienso"

### Sistema de reglas
Las reglas se evalúan en orden de prioridad:
1. **Opciones**: Responde con la primera opción encontrada
2. **Ya existe**: Reintentar con marca mutada
3. **Finalizadores**: Patrones de éxito/error globales
4. **Campos**: Respuestas puntuales a preguntas específicas

## Comandos útiles

```bash
# Verificar tipos TypeScript
npm run typecheck

# Ejecutar con navegador visible
HEADLESS=false npm run pw

# Ejecutar test específico con debug
DEBUG_CHECKPOINTS=after-detect npx playwright test tests/crear_cultivo.spec.ts

# Generar y exportar reportes
npm run pw && npm run report:pdf

# Ver reportes HTML
npm run pw:report
```