#!/bin/bash

# Script para extraer todo el código del proyecto en un archivo de texto
# Excluye node_modules y logs

OUTPUT_FILE="project-code-export.txt"
PROJECT_NAME="AutoLoop Twilio con Playwright (TypeScript)"

echo "Extrayendo código del proyecto..."

# Crear el archivo de salida y agregar header
cat > "$OUTPUT_FILE" << EOF
================================================================================
$PROJECT_NAME - Código Fuente Completo
================================================================================
Generado el: $(date)
Directorio: $(pwd)

================================================================================
ESTRUCTURA DEL PROYECTO
================================================================================
EOF

# Agregar estructura del proyecto (excluyendo node_modules y logs)
echo "" >> "$OUTPUT_FILE"
find . -type f \
  -not -path "./node_modules/*" \
  -not -path "./logs/*" \
  -not -path "./.git/*" \
  -not -name "*.log" \
  -not -name "$OUTPUT_FILE" \
  | sort >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "ARCHIVOS DEL PROYECTO" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"

# Función para procesar cada archivo
process_file() {
    local file="$1"
    local filename=$(basename "$file")
    local filepath="$file"
    
    echo "" >> "$OUTPUT_FILE"
    echo "────────────────────────────────────────────────────────────────────────────────" >> "$OUTPUT_FILE"
    echo "ARCHIVO: $filepath" >> "$OUTPUT_FILE"
    echo "────────────────────────────────────────────────────────────────────────────────" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    # Agregar contenido del archivo
    cat "$file" >> "$OUTPUT_FILE"
    
    echo "" >> "$OUTPUT_FILE"
}

# Procesar todos los archivos (excluyendo directorios no deseados)
find . -type f \
  -not -path "./node_modules/*" \
  -not -path "./logs/*" \
  -not -path "./.git/*" \
  -not -path "./playwright-report/*" \
  -not -path "./tests-results/*" \
  -not -name "*.log" \
  -not -name "$OUTPUT_FILE" \
  -not -name "extract-code.sh" \
  | sort | while read -r file; do
    process_file "$file"
done

echo "" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "FIN DEL PROYECTO - $(date)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"

echo "Código extraído exitosamente en: $OUTPUT_FILE"
echo "Tamaño del archivo: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo "Total de líneas: $(wc -l < "$OUTPUT_FILE")"