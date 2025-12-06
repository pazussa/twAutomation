#!/bin/bash
# Script para ejecutar frases faltantes y generar reporte final
# 
# Este script:
# 1. Prepara el archivo temp-exec con SOLO las frases faltantes
# 2. Ejecuta el test de Playwright
# 3. Fusiona los resultados
# 4. Genera el reporte final

set -e
cd "$(dirname "$0")/.."

EXECUTION_ID="496810a435e88506"
MISSING_ID="${EXECUTION_ID}-missing"

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     EJECUTAR FRASES FALTANTES Y GENERAR REPORTE FINAL            ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Paso 1: Preparar archivos
echo "📋 Paso 1: Preparando archivos..."

# Hacer backup de archivos actuales si no existen ya
if [ ! -f "temp-exec-${EXECUTION_ID}-original.json" ] && [ -f "temp-exec-${EXECUTION_ID}.json" ]; then
    cp "temp-exec-${EXECUTION_ID}.json" "temp-exec-${EXECUTION_ID}-original.json"
    echo "   ✓ Backup de temp-exec creado"
fi

if [ ! -f "conversation-${EXECUTION_ID}-original.json" ] && [ -f "conversation-${EXECUTION_ID}.json" ]; then
    cp "conversation-${EXECUTION_ID}.json" "conversation-${EXECUTION_ID}-original.json"
    echo "   ✓ Backup de conversation creado"
fi

# Ejecutar script para identificar faltantes y crear temp-exec
node scripts/execute-missing-phrases.mjs

# Verificar si hay faltantes
if [ ! -f "temp-exec-missing-${EXECUTION_ID}.json" ]; then
    echo ""
    echo "✅ No hay frases faltantes. ¡Todo está completo!"
    echo "   Generando reporte final..."
    node scripts/merge-final-report.mjs
    exit 0
fi

MISSING_COUNT=$(cat "temp-exec-missing-${EXECUTION_ID}.json" | jq '.examples | length')
echo ""
echo "   📊 Frases faltantes a ejecutar: ${MISSING_COUNT}"

# Mover archivos para que el test use las faltantes
echo ""
echo "📋 Paso 2: Configurando ejecución..."

# Ocultar el temp-exec original temporalmente
if [ -f "temp-exec-${EXECUTION_ID}.json" ]; then
    mv "temp-exec-${EXECUTION_ID}.json" "temp-exec-${EXECUTION_ID}.json.hidden"
fi

# Renombrar temp-exec de faltantes al ID de missing
mv "temp-exec-missing-${EXECUTION_ID}.json" "temp-exec-${MISSING_ID}.json"
echo "   ✓ temp-exec-${MISSING_ID}.json listo"

# Eliminar checkpoints antiguos que puedan interferir
rm -f checkpoint-*.json 2>/dev/null || true
echo "   ✓ Checkpoints anteriores eliminados"

echo ""
echo "📋 Paso 3: Ejecutando ${MISSING_COUNT} frases faltantes..."
echo "   ⏳ Esto puede tomar varios minutos..."
echo "   ⚠️  No cierres esta ventana"
echo ""

# Ejecutar Playwright
npx playwright test tests/execute-selected.spec.ts --headed --timeout=86400000 || {
    echo ""
    echo "⚠️  La ejecución terminó (puede ser normal si se completó o hubo pausa)"
}

echo ""
echo "📋 Paso 4: Fusionando resultados..."

# Restaurar temp-exec original
if [ -f "temp-exec-${EXECUTION_ID}.json.hidden" ]; then
    mv "temp-exec-${EXECUTION_ID}.json.hidden" "temp-exec-${EXECUTION_ID}.json"
fi

# Preparar archivos para la fusión
# La conversación de missing se habrá guardado como conversation-{MISSING_ID}.json
if [ -f "conversation-${MISSING_ID}.json" ]; then
    cp "conversation-${MISSING_ID}.json" "conversation-${EXECUTION_ID}-missing.json"
    echo "   ✓ Conversación de faltantes copiada"
fi

# Restaurar conversación original para la fusión
if [ -f "conversation-${EXECUTION_ID}-original.json" ]; then
    cp "conversation-${EXECUTION_ID}-original.json" "conversation-${EXECUTION_ID}.json"
    echo "   ✓ Conversación original restaurada"
fi

# Ejecutar script de fusión
node scripts/merge-final-report.mjs

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    ¡PROCESO COMPLETADO!                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Archivos generados:"
echo "   - conversation-${EXECUTION_ID}-final.json"
echo "   - test-results/conversations/reporte-final-${EXECUTION_ID}.html"
echo ""
echo "🌐 Abre el reporte HTML en tu navegador para ver los resultados."
