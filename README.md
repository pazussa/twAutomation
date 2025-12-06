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
```



###  Requisito Previo: Conectar al Bot

**Antes de usar el panel admin**, debes estar conectado al bot de WhatsApp:

1. Conectar vía OTP (correo)
2. conectar al sandbox de Twilio (sandbox [sandboxname])



### Panel de Administración
```bash
npm run admin
```
**Abre automáticamente:** http://localhost:3000

##  Características del Panel Admin


### 📋 Flujo de Uso
1. **Seleccionar**: Marca checkboxes de los ejemplos que deseas probar
2. **Ejecutar**: Click en "▶ Ejecutar Seleccionados"
3. **Observar**: Ve la ejecución en tiempo real en la terminal del servidor
4. **Esperar**: La conversión a PDF se ejecuta automáticamente al terminar
5. **Ver resultados**: Click en "📊 Abrir Carpeta de Reportes" para ver HTML y PDF

### 🔄 Sistema de Checkpoints y Reanudación

**Interrupciones Soportadas**: Puedes interrumpir la ejecución con `Ctrl+C` en cualquier momento.

**Al interrumpir:**
- ✅ Se guarda un checkpoint con el progreso actual
- ✅ Se genera reporte HTML con las conversaciones completadas
- ✅ Se genera PDF parcial automáticamente
- ✅ Aparece botón "🔄 Reanudar ejecución interrumpida" en el panel

**Al reanudar:**
- ✅ Continúa desde donde quedó (salta intents completados)
- ✅ Agrega conversaciones al mismo reporte HTML
- ✅ Regenera el PDF con todas las conversaciones (reemplaza el anterior)
- ✅ Soporta múltiples interrupciones/reanudaciones

**Al finalizar:**
- ✅ Genera reporte HTML final completo
- ✅ Genera PDF final con todas las conversaciones
- ✅ Elimina archivos temporales y checkpoint

**Ejemplo de flujo:**
```
Ejecución 1: 50 ejemplos → Ctrl+C en el #15 → PDF con 15 conversaciones
Reanudación 1: Continúa → Ctrl+C en el #35 → PDF actualizado con 35 conversaciones  
Reanudación 2: Continúa → Completa los 50 → PDF final con 50 conversaciones
```

###  Interfaz
- **Agrupación por intent**: Todos los ejemplos organizados por categoría
- **Contador de selección**: Muestra cuántos ejemplos has marcado
- **Búsqueda rápida**: Filtra intents y ejemplos en tiempo real
- **Estado de ejecución**: Indica si hay una ejecución en proceso
- **Edición y creación de intents/ejemplos** = mediante el panel de admin puedes agregar nuevas frases y nuevos intents para pruebas

##  Reportes Generados

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





### Sincronizar Cambios
```bash
npm run sync
```



## ➕ Agregar Nuevos Intents manualmente

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
   - Detecta diferentes tipos de mensajes: opciones, "ya existe", éxito, error, etc

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
- **Variable ya existente**: Mutación automática en reintentos.






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
