# Test de Sistema de Interrupciones

## Casos de prueba y simulación de flujos:

### ✅ Caso 1: Ejecución completa sin pausa
```
Estado inicial:
- isExecuting: false
- isPausing: false
- isPostProcessing: false
- checkpoint: null
- child: null

Flujo:
1. Usuario hace clic en "▶ Ejecutar" → /api/execute POST
2. Server crea temp-exec-{id}.json, isExecuting=true, spawn child
3. UI muestra "⏳ Ejecutando..." y botón "⏸ Pausar"
4. Test completa todos los ejemplos
5. child.on('close') con code=0
6. isExecuting=false, isPostProcessing=true, child=null
7. Server genera HTML/PDF
8. isPostProcessing=false
9. UI vuelve a estado inicial

Resultado: ✅ Correcto
```

### ✅ Caso 2: Pausa durante ejecución
```
Estado durante ejecución:
- isExecuting: true
- isPausing: false
- child: process

Flujo:
1. Usuario hace clic en "⏸ Pausar" → confirm()
2. UI muestra "💾 Pausando..." → /api/pause-execution POST
3. Server: isPausing=true, child.kill('SIGINT')
4. Test recibe SIGINT → isInterrupted=true
5. Test envía "cancelar" a WhatsApp (1.5s espera)
6. Test guarda checkpoint con interruptionCount+1
7. Test termina (finally block)
8. child.on('close') con code=130
9. isExecuting=false, isPausing=false, isPostProcessing=true
10. Server procesa conversation-*.json → genera HTML
11. Server genera PDF
12. isPostProcessing=false
13. UI muestra "▶ Reanudar" con progreso

Resultado: ✅ Correcto
```

### ✅ Caso 3: Reanudación desde checkpoint
```
Estado con checkpoint:
- isExecuting: false
- checkpoint: { totalProcessed: 5, totalExamples: 10, nextIntent: "get_crops" }

Flujo:
1. Usuario hace clic en "▶ Reanudar" → confirm()
2. UI muestra "⏳ Reanudando..." → /api/execute POST { resumeFromCheckpoint: true }
3. Server encuentra checkpoint-{id}.json y temp-exec-{id}.json
4. Server: isExecuting=true, spawn child
5. Test lee checkpoint y salta intents completados
6. Test continúa desde nextIntent
7. (igual que Caso 1 o Caso 2 dependiendo si se pausa)

Resultado: ✅ Correcto
```

### ✅ Caso 4: Múltiples pausas/reanudaciones
```
Flujo:
1. Ejecutar → Pausar (checkpoint: interruptionCount=1)
2. Reanudar → Pausar (checkpoint: interruptionCount=2)
3. Reanudar → Completar

Validación:
- interruptionCount se incrementa correctamente cada vez
- No hay doble incremento (bug corregido)
- UI muestra "(N pausas)" en el estado

Resultado: ✅ Correcto (se corrigió bug de doble incremento)
```

### ✅ Caso 5: Clic múltiple en botón pausar
```
Flujo:
1. Durante ejecución, usuario hace clic en "⏸ Pausar"
2. confirm() → acepta
3. Botón se deshabilita, muestra "💾 Pausando..."
4. Usuario intenta hacer clic nuevamente (no debería poder)
5. Si logra enviar request, server devuelve 409
6. UI ignora silenciosamente el 409

Resultado: ✅ Correcto (se agregó manejo de 409)
```

### ✅ Caso 6: Pausa justo al iniciar
```
Flujo:
1. Ejecutar con 10 ejemplos
2. Pausar inmediatamente (antes de completar ningún ejemplo)

Checkpoint esperado:
- totalProcessed: 0
- lastCompletedIntent: null
- nextIntent: primer intent ordenado

Resultado: ✅ Correcto
```

### ✅ Caso 7: Pausa en último ejemplo
```
Flujo:
1. Ejecutar con 10 ejemplos
2. Pausar durante el último ejemplo

Checkpoint esperado:
- totalProcessed: 9 (o 10 si completó antes del SIGINT)
- nextIntent: último intent (o completado)

Resultado: ✅ Correcto
```

### ✅ Caso 8: Estado isPostProcessing visible en UI
```
Flujo:
1. Ejecución completa o pausada termina
2. Server entra en isPostProcessing=true
3. UI muestra "📄 Generando reporte y PDF..."
4. Botón pausar oculto durante postProcessing
5. Al terminar, UI vuelve a estado normal

Resultado: ✅ Correcto (se agregó estado isPostProcessing en UI)
```

### ✅ Caso 9: Error en spawn
```
Flujo:
1. Usuario ejecuta pero spawn falla
2. child.on('error') se dispara
3. Todos los flags se resetean: isExecuting=false, isPausing=false, isPostProcessing=false
4. child=null, currentExecutionId=null
5. UI vuelve a estado inicial

Resultado: ✅ Correcto
```

### ✅ Caso 10: Reanudar sin checkpoint
```
Flujo:
1. Usuario intenta reanudar sin checkpoint existente
2. /api/execute POST { resumeFromCheckpoint: true }
3. Server devuelve 404 "No hay checkpoint para reanudar"
4. UI muestra error

Resultado: ✅ Correcto
```

## Correcciones implementadas en esta revisión:

1. ✅ **Mensajes de SIGINT actualizados**: Ahora dicen "⏸ PAUSA SOLICITADA" en lugar de "Ctrl+C"
2. ✅ **Eliminado segundo Ctrl+C**: Ya no se puede forzar cierre desde terminal
3. ✅ **Bug de doble incremento corregido**: interruptionCount ahora se incrementa solo una vez
4. ✅ **sortedExamplesMap usado en checkpoint**: El nextIntent se calcula con el orden correcto
5. ✅ **Estado isPostProcessing en UI**: Usuario ve "Generando reporte..." durante PDF
6. ✅ **Manejo de error 409**: UI ignora silenciosamente si ya se está pausando
7. ✅ **Espera después de cancelar**: 1.5s espera para que WhatsApp procese el mensaje

## Flujo de estados del servidor:

```
       [IDLE]
          |
    ejecutar
          ↓
   [EXECUTING] ←←←←←←←←←←←←←←←
     |        |                |
   pausar   completar      error
     ↓         ↓               |
 [PAUSING]  [POST_PROCESSING]  |
     |         |               |
   terminar  terminar          |
     ↓         ↓               |
 [POST_PROCESSING]             |
     |                         |
   terminar                    |
     ↓                         |
   [IDLE] (con checkpoint) ←←←←
     |
   reanudar
     ↓
   [EXECUTING] ...
```

## Variables de estado:

| Variable | Descripción |
|----------|-------------|
| `isExecuting` | Proceso Playwright corriendo |
| `isPausing` | SIGINT enviado, esperando cierre |
| `isPostProcessing` | Generando HTML/PDF |
| `currentExecutionId` | ID de ejecución actual |
| `child` | Referencia al proceso hijo |