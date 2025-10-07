IMÁGENES PARA EL INFORME DE PASANTÍA
=====================================

✓ IMAGEN COMPLETADA:
--------------------
• architecture-diagram.png (780 KB, 4800x3600 px @ 300 DPI)
  - Diagrama de bloques de la arquitectura del proyecto
  - Generado automáticamente con Python/matplotlib
  - Muestra: capas del sistema, flujo de datos, componentes principales


IMÁGENES PENDIENTES: 9
=======================

INSTRUCCIONES GENERALES:
- Todas las capturas deben guardarse en formato PNG o JPG
- Resolución recomendada: 1280x720 px o superior
- Nombrar archivos sin espacios, usar guiones: project-structure.png


LISTA DE IMÁGENES NECESARIAS:
==============================

1. project-structure.png
   Descripción: Estructura del proyecto de automatización
   Cómo extraerla: Captura del árbol de directorios del proyecto
   Comando sugerido: tree -L 2 /home/user/newautomwpp/2 > estructura.txt
   Luego tomar screenshot del archivo o del output del comando


2. whatsapp-login.png
   Descripción: Proceso de autenticación y persistencia de sesión
   Cómo extraerla: Captura de WhatsApp Web mostrando código QR o sesión activa
   Acción: Abrir web.whatsapp.com en navegador y capturar pantalla


3. interaction-flow.png
   Descripción: Flujo de interacción con WhatsApp Web mediante Page Objects
   Cómo extraerla: Diagrama de flujo o captura del código mostrando funciones:
                   openChat(), clearChat(), typeIntoComposer(), etc.
   Archivo: tests/setup/utils.ts líneas 48-100


4. keyword-rules.png
   Descripción: Sistema de reglas por palabras clave para decisión automática
   Cómo extraerla: Captura del código KEYWORD_RULES en tests/setup/data.ts
   Archivo: tests/setup/data.ts - buscar "export const KEYWORD_RULES"


5. get-crops-execution.png
   Descripción: Ejecución de listado y filtrado de cultivos
   Cómo extraerla: Ejecutar prueba y capturar terminal o reporte HTML
   Comando: npx playwright test tests/get_crops.spec.ts --headed
   Capturar: Conversación en WhatsApp Web durante la ejecución


6. campaign-flow.png
   Descripción: Flujo end-to-end de creación y gestión de campaña
   Cómo extraerla: Ejecutar prueba de campaña y capturar conversación completa
   Comando: npx playwright test tests/create_planned_campaign.spec.ts --headed
   Capturar: Toda la secuencia de mensajes en WhatsApp Web


7. admin-panel.png
   Descripción: Panel de administración para ejecución selectiva
   Cómo extraerla: Iniciar servidor y capturar interfaz web
   Comando: npm run admin
   Abrir: http://localhost:3000 y capturar pantalla completa


8. conversation-report.png
   Descripción: Reporte de conversación con timeline y estados
   Cómo extraerla: Abrir reporte HTML generado en playwright-report/
   Ubicación: playwright-report/index.html
   Capturar: Vista del reporte mostrando línea temporal y estadísticas


9. loop-detection.png
   Descripción: Detección de bucle infinito en reporte
   Cómo extraerla: Modificar código para forzar bucle y capturar error en reporte
   Alternativa: Crear captura simulada mostrando mensaje de error de bucle
   Buscar en código: "Bucle infinito detectado" en tests/setup/flow.ts


PASOS PARA INSERTAR LAS IMÁGENES EN EL DOCUMENTO:
===================================================

1. Guardar cada imagen en esta carpeta: docs/Informe_pasantía/figures/

2. En el archivo 3. Actividades.tex, descomentar las líneas:
   Cambiar:  % \includegraphics[width=0.8\textwidth]{figures/nombre-archivo.png}
   Por:      \includegraphics[width=0.8\textwidth]{figures/nombre-archivo.png}

3. Recompilar el documento:
   cd docs/Informe_pasantía
   pdflatex main.tex
   pdflatex main.tex  (dos veces para referencias)

4. Verificar que las imágenes aparezcan correctamente en el PDF generado
