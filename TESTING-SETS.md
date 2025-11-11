# Sets de Prueba - WhatsApp Automation

Este documento describe los sets de prueba organizados por funcionalidad para facilitar la validación específica de intents.

## 📋 Sets Disponibles

### 🛠️ SET DE CREACIÓN (`creation-set.spec.ts`)
**SOLO Intents que empiecen con "create*" (5 intents)**

- **createChemicalProduct** - Crear productos químicos  
- **createCrop** - Crear cultivos
- **createFertilizer** - Crear fertilizantes
- **createPlannedCampaign** - Planificar campañas
- **createPlannedWork** - Crear trabajos planificados

### 🔍 SET NO-CREACIÓN (`query-set.spec.ts`)  
**TODOS los demás intents que NO empiecen con "create*" (24 intents)**

**Operaciones de Asignación:**
- **assignPriceProduct** - Asignar precios a productos

**Consultas GET:**
- **getChemicalProducts** - Listar productos químicos
- **getCropDistribution** - Distribución de cultivos
- **getCrops** - Listar cultivos
- **getLastWork** - Último trabajo realizado
- **getMinPrice** - Precio mínimo histórico
- **getPendingWorks** - Trabajos pendientes
- **checkUnplannedFields** - Campos sin planificar
- **getActiveMatterChemicalProducts** - Productos por materia activa
- **getChemicalProductsByClient** - Productos químicos por cliente
- **getFertilizers** - Listar fertilizantes
- **getLastPrice** - Último precio registrado
- **getManufacturerProducts** - Productos por fabricante
- **getPlannedCampaignsHistory** - Historial de campañas
- **getPriceVariation** - Variación de precios
- **getSeedsNeeded** - Semillas necesarias

**Filtros y Búsquedas:**
- **filterFertilizers** - Filtrar fertilizantes
- **searchProducts** - Buscar productos generales
- **searchProductsCrops** - Buscar cultivos específicos
- **searchProductsFertilizers** - Buscar fertilizantes específicos

**Interacción Conversacional:**
- **goodbye** - Despedidas
- **greet** - Saludos

**Operaciones de Reporte:**
- **reportFinishedWork** - Reportar trabajos terminados

**Autenticación:**
- **requestOtp** - Solicitar código OTP

## 🚀 Comandos de Ejecución

### Modo Visible (con navegador)
```bash
# Ejecutar SOLO intents create* (5 intents)
npm run test:creation

# Ejecutar TODOS los demás intents (24 intents)
npm run test:query
```

### Modo Headless (sin navegador)
```bash
# Ejecutar set create* en background
npm run test:creation-headless

# Ejecutar set no-create* en background
npm run test:query-headless
```

### Comandos Playwright Directos
```bash
# Set create* solamente
npx playwright test tests/creation-set.spec.ts --headed

# Set no-create* (todo lo demás)
npx playwright test tests/query-set.spec.ts --headed

# Ambos sets juntos (los 29 intents completos)
npx playwright test tests/creation-set.spec.ts tests/query-set.spec.ts --headed
```

## 📊 Cobertura Total: 29 Intents

### ✅ Intents CREATE* (5/29)
1. createChemicalProduct
2. createCrop  
3. createFertilizer
4. createPlannedCampaign
5. createPlannedWork

### ✅ Intents NO-CREATE* (24/29)
1. assignPriceProduct
2. getChemicalProducts
3. getCropDistribution  
4. getCrops
5. getLastWork
6. getMinPrice
7. getPendingWorks
8. checkUnplannedFields
9. filterFertilizers
10. getActiveMatterChemicalProducts
11. getChemicalProductsByClient
12. getFertilizers
13. getLastPrice
14. getManufacturerProducts
15. getPlannedCampaignsHistory
16. getPriceVariation
17. getSeedsNeeded
18. goodbye
19. greet
20. reportFinishedWork
21. requestOtp
22. searchProducts
23. searchProductsCrops
24. searchProductsFertilizers

## 🎯 Frases de Prueba por Intent

Cada intent utiliza **las frases exactas definidas en INTENTS_TEMPLATES**, sin inventar nuevas frases:

### Cantidad de Frases Reales:
- **Máximo 5 frases** por intent (cuando están disponibles)
- **Frases exactas** extraídas de `tests/setup/data.ts` 
- **Sin invenciones** - solo datos reales del sistema

### Ejemplos de Frases por Cantidad:

**5 Frases:**
- **createCrop**: "quiero registrar un cultivo", "crear cultivo", "registrar un nuevo cultivo", "me gustaría crear un cultivo nuevo", "voy a crear un cultivo"
- **getSeedsNeeded**: "Hola Luca, ¿cuántos kilos de semillas necesito?", "¿Qué cantidad de semillas se necesita para esta campaña?", etc.

**3 Frases:**
- **createPlannedWork**: "crear un trabajo planificado", "planificar un trabajo", "quiero crear un trabajo en una campaña"
- **goodbye**: "adiós", "chao", "hasta luego"

**Variable (5 de 9):**
- **checkUnplannedFields**: Usa 5 frases de las 9 disponibles en datos originales

## 📈 Interpretación de Resultados

### Símbolos de Estado
- ✅ **ÉXITO** - El intent se completó correctamente
- ❌ **FALLO** - Error en el flujo o timeout

### Logging Detallado
Cada test muestra:
- 🔍 **Reglas determinantes** aplicadas
- 🎯 **Opciones extraídas** automáticamente
- 📝 **Mensajes del bot** recibidos
- ⚡ **Flujo de respuestas** completo

## 🛠️ Configuración

### Variables de Entorno
Los sets usan las variables definidas en `tests/setup/data.ts`:
- `crop_name`: "maíz" 
- `variety_name`: "amarillo costeño"
- `fertilizer_name`: "Nitrofoska"
- `search_query`: "Girasol"
- Y más...

### Reseteo Automático
- Cada test resetea las variables a valores por defecto
- Se reinicia el chat entre frases para evitar interferencias
- Las reglas de "ya existe" activan retry automático

## 📝 Notas Técnicas

- **Función extractFirstOption**: Maneja automáticamente la selección de opciones múltiples
- **Intent filtering**: Cada regla puede especificar a qué intents aplica
- **Prioridad de reglas**: Sistema de prioridades para resolver conflictos
- **Logging detallado**: Debug completo para troubleshooting

## 🎉 Uso Recomendado

1. **Desarrollo**: Usar modo `--headed` para ver el flujo visual
2. **CI/CD**: Usar modo headless para automatización
3. **Debug**: Revisar logs de consola para reglas aplicadas
4. **Validación**: Verificar que ambos sets pasen antes de deployment

**Distribución perfecta**: 5 intents create* + 24 intents no-create* = 29 intents totales ✅