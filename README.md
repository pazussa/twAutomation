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

## 🚀 Inicio Rápido

### ⚠️ Requisito Previo: Conectar al Bot

**Antes de usar el panel admin**, debes estar conectado al bot de WhatsApp:

1. Abre WhatsApp Web en tu navegador
2. Escanea el código QR con tu teléfono
3. Verifica que la sesión esté activa

**Importante**: El bot usa la sesión activa de WhatsApp Web para las pruebas.

### Panel de Administración
```bash
npm run admin
```
**Abre automáticamente:** http://localhost:3000

## 🎯 Características del Panel Admin

### ✨ Funcionalidades
- ✅ **Selección visual** de ejemplos específicos con checkboxes
- ✅ **Combinación libre** de ejemplos de diferentes intents
- ✅ **Variables realistas** extraídas automáticamente de archivos YML
- ✅ **Ejecución en tiempo real** visible en terminal del servidor
- ✅ **Generación automática de PDF** al finalizar cada ejecución
- ✅ **Detección de bucles infinitos** (detiene automáticamente después de 5 respuestas idénticas)
- ✅ **Acceso directo** a carpeta de reportes con un click
- ✅ **29 intents sincronizados** desde archivos YML (test2/ y test3/)

### 📋 Flujo de Uso
1. **Seleccionar**: Marca checkboxes de los ejemplos que deseas probar
2. **Ejecutar**: Click en "▶ Ejecutar Seleccionados"
3. **Observar**: Ve la ejecución en tiempo real en la terminal del servidor
4. **Esperar**: La conversión a PDF se ejecuta automáticamente al terminar
5. **Ver resultados**: Click en "📊 Abrir Carpeta de Reportes" para ver HTML y PDF

### 🎨 Interfaz
- **Agrupación por intent**: Todos los ejemplos organizados por categoría
- **Contador de selección**: Muestra cuántos ejemplos has marcado
- **Búsqueda rápida**: Filtra intents y ejemplos en tiempo real
- **Estado de ejecución**: Indica si hay una ejecución en proceso

## 📊 Reportes Generados

### Conversiones Automáticas
- **HTML**: Generados automáticamente en `playwright-report/`
- **PDF**: Convertidos automáticamente al finalizar cada ejecución
- **Ubicación**: Los PDFs se guardan en `exports/playwright-report/` con timestamp

### Ejemplo de Reporte

Los reportes muestran conversaciones detalladas con timeline completo:

```
📊 Crear cultivo - Todos los intents
Status: ✅ passed  
Duración: 2201629 ms

📈 Resumen:
- Eventos: 426
- ✅ OK: 418  
- ❌ FAIL: 8
- 🎯 Intents: 40

💬 Conversación:
[1/40] crear cultivo ✅ OK
  📤 Enviado: crear cultivo
  📥 Recibido: Destino del cultivo.
  📤 Enviado: consumo
  📥 Recibido: Marca del cultivo.
  📤 Enviado: Bayer
   Recibido: Cultivo registrado exitosamente.
```

### Características del Reporte:
- ✅ Timeline completo con timestamps
- ✅ Estados visuales (éxito/error)
- ✅ Agrupación por intent
- ✅ Estadísticas globales
- ✅ Detección de bucles infinitos
- ✅ Exportación automática a PDF

## ⚙️ Configuración Inicial

### Configurar Twilio Sandbox
Antes de ejecutar pruebas:

1. Envía WhatsApp a: **+1 (415) 523-8886**
2. Mensaje: `join [tu-sandbox-name]`
3. Ejemplo: `join weather-assistant`
4. Espera confirmación de conexión

## 📁 Estructura del Proyecto

```
tests/
├── setup/
│   ├── utils.ts      # Utilidades WhatsApp Web
│   ├── data.ts       # Variables, intents y reglas (AUTO-GENERADO)
│   └── flow.ts       # Fixtures Playwright y detección de bucles
├── test2/            # 11 archivos YML (fuente principal)
├── test3/            # 18 archivos YML adicionales
├── _setup.ts         # Re-exporta setup/flow
└── *.spec.ts         # 29 specs auto-generados (uno por intent)

src/admin/
├── server.ts         # Backend Express del panel admin
└── public/
    └── index.html    # Frontend del panel admin

scripts/
├── export-report-to-pdf.mjs  # Conversión automática HTML→PDF
└── sync-yml-to-data.mjs      # Sincronizador YML→TypeScript
```

## 🔄 Sistema de Sincronización YML

**Los archivos YML son la única fuente de verdad.** Todo se genera automáticamente desde ellos.

### Sincronizar Cambios
```bash
npm run sync
```

### Qué se Regenera:
- ✅ `tests/setup/data.ts` (29 intents, 31 variables)
- ✅ `tests/*.spec.ts` (29 archivos)
- ✅ Valores extraídos de anotaciones `[texto](variable)`
- ✅ Fecha actual para `[hoy]` → `2025-10-03`

### Valores de Variables

**Prioridad de valores:**
1. **Primero**: Valor anotado en YML `[Nitrofoska](fertilizer_name)`
2. **Segundo**: Fecha actual si es `[hoy](price_date)`
3. **Tercero**: Default genérico (fallback)

**Ejemplos de valores extraídos:**
```yaml
# En YML:
- Quiero registrar el [Nitrofoska](fertilizer_name) de tipo [granulado](type_fertilizer)
- Cultivo [maíz](crop_name) variedad [amarillo costeño](variety_name)
- Precio [340](price) €/tn desde [hoy](price_date)

# Genera en data.ts:
fertilizer_name: 'Nitrofoska'      // no "NPK Completo"
type_fertilizer: 'granulado'       // extraído
crop_name: 'maíz'                  // no "trigo"
variety_name: 'amarillo costeño'   // no "Chamorro"
price: '340'                       // extraído
price_date: '2025-10-03'           // FECHA ACTUAL
```

## ➕ Agregar Nuevos Intents

### 1. Crear Archivo YML
En `tests/test2/` o `tests/test3/`:

```yaml
version: "3.1"
nlu:
- intent: mi_nuevo_intent
  examples: |
    - frase simple
    - frase con [Nitrofoska](fertilizer_name)
    - con cliente [AgroTalavera](client) y precio [hoy](price_date)
```

**Importante:**
- Formato: `[texto visible](nombre_variable)`
- Nombres: `snake_case` → se convierten a `camelCase`
- Especial: `[hoy]` → fecha actual automática

### 2. Sincronizar
```bash
npm run sync
```

### 3. Resultado ✅
- Nuevo intent en `data.ts`
- Archivo `tests/mi_nuevo_intent.spec.ts` creado
- Variables extraídas y materializadas
- Aparece automáticamente en panel admin

## 🔍 Cómo Funciona el Sistema

### Flujo de Conversación
1. **Inicialización**: 
   - Limpia chat de WhatsApp
   - Resetea variables a defaults
   - Selecciona cultivo aleatorio de `CROPS_POOL`

2. **Envío y Espera**:
   - Envía mensaje inicial
   - Espera primera respuesta (timeout: 45s)
   - Agrega mensajes adicionales (espera: 5s)

3. **Detección con Reglas**:
   - Analiza respuesta del bot con `KEYWORD_RULES`
   - Patrones ordenados por prioridad (1-4)
   - Detecta: opciones, "ya existe", éxito, error, campos

4. **Acción Automática**:
   - `REPLY`: Responde con valor de variable
   - `END_OK`: Finaliza exitosamente
   - `END_ERR`: Finaliza con error
   - `RETRY_EXISTS`: Reintentar con marca mutada
   - `__EXTRACT_FIRST_OPTION__`: Extrae primera opción de lista

5. **Detección de Bucles**:
   - Rastrea últimas 5 respuestas enviadas
   - Si todas son idénticas → detecta bucle infinito
   - Finaliza automáticamente con error

### Variables Dinámicas
- **Cultivos**: Selección aleatoria de `CROPS_POOL`
- **Fecha actual**: `[hoy]` → `2025-10-03` (se actualiza diariamente)
- **Marcas**: Mutación automática en reintentos "ya existe"
- **Valores YML**: Extraídos de anotaciones `[texto](variable)`

### Sistema de Reglas (Prioridad)
```
Priority 1: Opciones (extrae primera opción de listas)
Priority 2: "Ya existe" (reintenta con marca mutada)
Priority 3: Finalizadores (éxito/error globales)
Priority 4: Campos específicos (responde con variable)
```

### Patrones Flexibles
```javascript
// Detecta variaciones de "destino":
/\bdestino(\s+del\s+cultivo)?/i

// Matches:
✅ "Destino"
✅ "Destino."
✅ "Destino del cultivo"
✅ "¿Cuál es el destino?"
```

## 🛠️ Comandos Útiles

```bash
# Panel de administración
npm run admin

# Sincronizar YML → TypeScript
npm run sync

# Verificar tipos TypeScript
npm run typecheck

# Convertir reportes HTML → PDF (manual)
npm run report:pdf
```

## 🐛 Debugging

El sistema incluye detección automática de errores:
- ✅ **Timeouts**: 45s sin respuesta del bot
- ✅ **Bucles infinitos**: 5 respuestas idénticas consecutivas
- ✅ **Errores del bot**: Patrones "error", "fallo", "no se pudo"
- ✅ **Elementos duplicados**: "ya existe" → reintento automático