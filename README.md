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

## Comandos principales

### Ejecutar pruebas específicas
```bash
# Ejecutar una prueba específica, ejemplos:
npm run pw tests/asignar_precios_producto.spec.ts
npm run pw tests/consultar_campos.spec.ts
npm run pw tests/consultar_distribucion_cultivos.spec.ts
npm run pw tests/consultar_trabajos.spec.ts
npm run pw tests/consultar_trabajos_hoy.spec.ts
npm run pw tests/crear_campana.spec.ts
npm run pw tests/crear_cultivo.spec.ts
npm run pw tests/crear_fertilizante.spec.ts
npm run pw tests/crear_fitosanitario.spec.ts
npm run pw tests/listar_cultivos.spec.ts
npm run pw tests/listar_fertilizantes.spec.ts
npm run pw tests/listar_fitosanitarios.spec.ts
```

### Generar reportes HTML
```bash
# Ejecutar pruebas (genera reportes automáticamente)
npm run pw
```
Los reportes se guardan en `test-results/conversations/`

### Convertir reportes a PDF
```bash
# Convertir todos los reportes HTML a PDF
npm run report:pdf
```
Los PDFs se guardan en `exports/test-results/conversations/`

## Ejemplo de reporte generado

Los reportes HTML muestran conversaciones detalladas organizadas de forma visual:

### 📊 Crear cultivo - Todos los intents
**Status:** ✅ passed  
**Duración:** 2201629 ms  
**Archivo:** tests/crear_cultivo.spec.ts  

📈 **Resumen:**
- Eventos: 426
- ✅ OK: 418  
- ❌ FAIL: 8
- 🎯 Intents: 40

---

### 💬 Conversación por intent

**[1/40] crear cultivo** ✅ OK

| # | Tipo | Texto | Timestamp | Resultado |
|---|------|-------|-----------|-----------|
| 1 | 📤 Enviado | crear cultivo | 14:19:35 | ✅ OK |
| 2 | 📥 Recibido | Destino del cultivo. | 14:19:47 | ✅ OK |
| 3 | 📤 Enviado | consumo | 14:19:47 | ✅ OK |
| 4 | 📥 Recibido | Marca del cultivo. | 14:19:57 | ✅ OK |
| 5 | 📤 Enviado | MarcaTomate123 | 14:19:57 | ✅ OK |

**[2/40] hola quiero crear un cultivo** ✅ OK

| # | Tipo | Texto | Timestamp | Resultado |
|---|------|-------|-----------|-----------|
| 1 | 📤 Enviado | hola quiero crear un cultivo | 14:20:15 | ✅ OK |
| 2 | 📥 Recibido | Destino del cultivo. | 14:20:22 | ✅ OK |
| 3 | 📤 Enviado | consumo | 14:20:22 | ✅ OK |

---

### 📋 Características del reporte:
- **Timeline completo** con todos los mensajes enviados y recibidos
- **Estados visuales** con emojis y colores para éxito/error
- **Timestamps precisos** de cada interacción
- **Agrupación por intent** para fácil navegación
- **Estadísticas globales** de la sesión de pruebas

## Configuración inicial

### 1. Configurar Twilio Sandbox
Antes de ejecutar las pruebas, debes unirte al sandbox de Twilio:

1. Envía un mensaje WhatsApp a **+1 (415) 523-8886**
2. El mensaje debe ser: `join [nombre-del-sandbox]`
3. Ejemplo: `join weather-assistant` 
4. Espera la confirmación de que te has unido al sandbox

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

## Cómo agregar nuevos intents

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

## Comandos adicionales

```bash
# Verificar tipos TypeScript
npm run typecheck

# Ejecutar con navegador visible
HEADLESS=false npm run pw

# Ver reportes HTML en navegador
npm run pw:report
```