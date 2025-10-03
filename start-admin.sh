#!/bin/bash

# Script para iniciar el servidor admin y abrir el navegador

# Obtener el directorio del script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Función para verificar si el servidor está corriendo
check_server() {
    curl -s http://localhost:3000 > /dev/null 2>&1
    return $?
}

# Verificar si el servidor ya está corriendo
if check_server; then
    echo "✓ Servidor admin ya está corriendo en http://localhost:3000"
else
    echo "⏳ Iniciando servidor admin..."
    # Iniciar el servidor en segundo plano
    npm run admin > /tmp/admin-server.log 2>&1 &
    SERVER_PID=$!
    echo "Servidor iniciado con PID: $SERVER_PID"
    
    # Esperar a que el servidor esté listo (máximo 10 segundos)
    for i in {1..20}; do
        sleep 0.5
        if check_server; then
            echo "✓ Servidor admin listo en http://localhost:3000"
            break
        fi
        if [ $i -eq 20 ]; then
            echo "⚠️  Timeout esperando al servidor. Revisa /tmp/admin-server.log"
            exit 1
        fi
    done
fi

# Abrir el navegador
echo "🌐 Abriendo navegador..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000
elif command -v gnome-open > /dev/null; then
    gnome-open http://localhost:3000
elif command -v open > /dev/null; then
    open http://localhost:3000
else
    echo "Por favor, abre manualmente: http://localhost:3000"
fi

echo ""
echo "Panel de administración iniciado"
echo "URL: http://localhost:3000"
echo ""
echo "Para detener el servidor, ejecuta: pkill -f 'node.*admin/server'"
