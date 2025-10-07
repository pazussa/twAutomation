#!/usr/bin/env python3
"""
Diagrama de arquitectura del proyecto de automatización de pruebas de WhatsApp
Versión simplificada para incluir en documentos
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.lines as mlines

# Configurar figura más compacta
fig, ax = plt.subplots(figsize=(12, 8))
ax.set_xlim(0, 12)
ax.set_ylim(0, 8)
ax.axis('off')

# Colores del esquema (más suaves)
COLOR_EXTERNAL = '#B3E5FC'  # Azul
COLOR_CORE = '#FFE082'      # Amarillo/Naranja
COLOR_DATA = '#C5E1A5'      # Verde
COLOR_TESTS = '#F48FB1'     # Rosa
COLOR_REPORT = '#CE93D8'    # Púrpura
COLOR_ADMIN = '#80CBC4'     # Turquesa

def add_box(ax, x, y, width, height, text, color, fontsize=10, bold=False):
    """Agrega una caja con texto al diagrama"""
    box = FancyBboxPatch((x, y), width, height,
                         boxstyle="round,pad=0.08",
                         edgecolor='#37474F',
                         facecolor=color,
                         linewidth=2.5)
    ax.add_patch(box)
    
    weight = 'bold' if bold else 'normal'
    ax.text(x + width/2, y + height/2, text,
            ha='center', va='center',
            fontsize=fontsize, fontweight=weight,
            wrap=True)

def add_arrow(ax, x1, y1, x2, y2, label='', style='->', color='#37474F'):
    """Agrega una flecha entre dos puntos"""
    arrow = FancyArrowPatch((x1, y1), (x2, y2),
                           arrowstyle=style,
                           color=color,
                           linewidth=2.5,
                           mutation_scale=25)
    ax.add_patch(arrow)
    
    if label:
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mid_x, mid_y, label,
                ha='center', va='center',
                fontsize=8, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', 
                         edgecolor='#37474F', linewidth=1.5))

# Título simplificado
ax.text(6, 7.6, 'Arquitectura del Framework de Automatización',
        ha='center', fontsize=14, fontweight='bold')

# ============================================================================
# CAPA 1: SERVICIOS EXTERNOS (Top)
# ============================================================================
ax.text(0.5, 10, 'SERVICIOS EXTERNOS', fontsize=10, fontweight='bold', color='#1976D2')

add_box(ax, 0.5, 8.8, 2.5, 0.8, 'WhatsApp Web\nweb.whatsapp.com', COLOR_EXTERNAL, fontsize=9, bold=True)
add_box(ax, 3.5, 8.8, 2.5, 0.8, 'Bot Agrícola\n(Servidor Backend)', COLOR_EXTERNAL, fontsize=9, bold=True)

# ============================================================================
# CAPA 2: PLAYWRIGHT & BROWSER (Control de navegador)
# ============================================================================
add_box(ax, 0.5, 7.5, 5.5, 0.8, 'Playwright - Chromium (Contexto Persistente)\nAutomatización del navegador', COLOR_CORE, fontsize=9, bold=True)

# ============================================================================
# CAPA 3: MÓDULOS CORE (Utilidades y gestión de flujo)
# ============================================================================
ax.text(0.5, 6.8, 'NÚCLEO DEL FRAMEWORK', fontsize=10, fontweight='bold', color='#F57C00')

# Utils (izquierda)
add_box(ax, 0.5, 5.2, 2.8, 1.2, 
        'utils.ts\n\n• ensureLogin()\n• openChat()\n• clearChat()\n• typeIntoComposer()\n• waitFirstResponse()\n• getNewIncomingAfter()', 
        COLOR_CORE, fontsize=7)

# Flow (centro)
add_box(ax, 3.5, 5.2, 2.8, 1.2,
        'flow.ts\n\n• runAutoLoop()\n• detectActionFrom()\n• finishIntent()\n• ConversationLogger\n• Fixtures de Playwright',
        COLOR_CORE, fontsize=7)

# ============================================================================
# CAPA 4: GESTIÓN DE DATOS
# ============================================================================
ax.text(7, 6.8, 'GESTIÓN DE DATOS', fontsize=10, fontweight='bold', color='#689F38')

add_box(ax, 7, 5.2, 2.5, 1.2,
        'data.ts\n\n• INTENTS (29 intents)\n• VARS (variables)\n• KEYWORD_RULES\n• pickRandomCrop()\n• materialize()\n• 942 frases totales',
        COLOR_DATA, fontsize=7)

# ============================================================================
# CAPA 5: ESPECIFICACIONES DE PRUEBA
# ============================================================================
ax.text(0.5, 4.5, 'ESPECIFICACIONES DE PRUEBA (30 archivos .spec.ts)', fontsize=10, fontweight='bold', color='#C2185B')

# Fase 1
add_box(ax, 0.5, 3.2, 2.3, 0.9,
        'FASE 1 - Consultas\n\n• get_crops.spec.ts\n• get_fertilizers.spec.ts\n• request_otp.spec.ts\n• (15 specs total)',
        COLOR_TESTS, fontsize=7)

# Fase 2
add_box(ax, 3, 3.2, 2.3, 0.9,
        'FASE 2 - Creaciones\n\n• create_crop.spec.ts\n• create_fertilizer.spec.ts\n• assign_price.spec.ts\n• (8 specs total)',
        COLOR_TESTS, fontsize=7)

# Fase 3
add_box(ax, 5.5, 3.2, 2.5, 0.9,
        'FASE 3 - Campañas\n\n• create_planned_campaign\n• create_planned_work\n• report_finished_work\n• (7 specs total)',
        COLOR_TESTS, fontsize=7)

# ============================================================================
# CAPA 6: SISTEMA DE REPORTES
# ============================================================================
ax.text(0.5, 2.5, 'SISTEMA DE REPORTES', fontsize=10, fontweight='bold', color='#7B1FA2')

add_box(ax, 0.5, 1.2, 3, 0.9,
        'conversation-reporter.ts\n\n• Timeline de mensajes\n• Estadísticas (OK/FAIL)\n• Exportación HTML',
        COLOR_REPORT, fontsize=8)

add_box(ax, 3.8, 1.2, 2.8, 0.9,
        'export-report-to-pdf.mjs\n\n• Conversión HTML → PDF\n• Usa Playwright Chromium\n• Preserva estilos CSS',
        COLOR_REPORT, fontsize=8)

# ============================================================================
# CAPA 7: PANEL DE ADMINISTRACIÓN
# ============================================================================
ax.text(10, 6.8, 'PANEL WEB', fontsize=10, fontweight='bold', color='#00796B')

add_box(ax, 10, 5.2, 2.3, 1.2,
        'src/admin/server.ts\n\n• Express.js :3000\n• REST API\n• CRUD intents\n• Ejecución selectiva\n• Frontend HTML',
        COLOR_ADMIN, fontsize=7)

# ============================================================================
# SALIDAS DEL SISTEMA
# ============================================================================
ax.text(10, 2.5, 'SALIDAS', fontsize=10, fontweight='bold', color='#424242')

add_box(ax, 10, 1.7, 2.3, 0.6,
        'playwright-report/\nindex.html',
        '#E0E0E0', fontsize=8)

add_box(ax, 10, 0.9, 2.3, 0.6,
        'exports/\nreport.pdf',
        '#E0E0E0', fontsize=8)

# ============================================================================
# FLECHAS DE FLUJO
# ============================================================================

# WhatsApp Web <-> Playwright
add_arrow(ax, 1.75, 8.8, 1.75, 8.3)
add_arrow(ax, 2.25, 8.3, 2.25, 8.8)

# Bot <-> WhatsApp (comunicación externa)
add_arrow(ax, 3, 9.2, 3.3, 9.2, style='<->')

# Playwright -> Utils/Flow
add_arrow(ax, 1.75, 7.5, 1.75, 6.4)
add_arrow(ax, 4.75, 7.5, 4.75, 6.4)

# Utils/Flow <-> Data
add_arrow(ax, 3.3, 5.8, 7, 5.8, 'usa datos')
add_arrow(ax, 7, 5.4, 6.3, 5.4, 'actualiza vars')

# Flow -> Specs
add_arrow(ax, 1.75, 5.2, 1.75, 4.1, 'runAutoLoop()')
add_arrow(ax, 4.75, 5.2, 4.15, 4.1)
add_arrow(ax, 4.75, 5.2, 6.75, 4.1)

# Specs -> Reporter
add_arrow(ax, 1.7, 3.2, 2, 2.1, 'logs')
add_arrow(ax, 4.15, 3.2, 2.5, 2.1)
add_arrow(ax, 6.75, 3.2, 3, 2.1)

# Reporter -> PDF
add_arrow(ax, 3.5, 1.6, 4.5, 1.6)

# PDF -> Output
add_arrow(ax, 6.6, 1.6, 10, 1.3, 'genera')

# Admin Panel -> Data
add_arrow(ax, 10, 5.8, 9.5, 5.8, 'lee/edita', style='<->')

# Admin Panel -> Playwright (ejecución)
add_arrow(ax, 10, 6, 6, 7.9, 'dispara tests', style='->')

# ============================================================================
# LEYENDA
# ============================================================================
legend_y = 0.3
ax.text(0.5, legend_y + 0.2, 'LEYENDA:', fontsize=9, fontweight='bold')

legend_items = [
    (COLOR_EXTERNAL, 'Servicios Externos'),
    (COLOR_CORE, 'Núcleo del Framework'),
    (COLOR_DATA, 'Gestión de Datos'),
    (COLOR_TESTS, 'Especificaciones de Prueba'),
    (COLOR_REPORT, 'Sistema de Reportes'),
    (COLOR_ADMIN, 'Panel de Administración')
]

for i, (color, label) in enumerate(legend_items):
    x_pos = 0.5 + (i % 3) * 3.5
    y_pos = legend_y - 0.3 if i >= 3 else legend_y
    
    small_box = mpatches.Rectangle((x_pos, y_pos), 0.3, 0.15,
                                   edgecolor='#424242',
                                   facecolor=color,
                                   linewidth=1)
    ax.add_patch(small_box)
    ax.text(x_pos + 0.4, y_pos + 0.075, label, fontsize=7, va='center')

# Información del proyecto
ax.text(13, 0.3, 'Proyecto: twAutomation', fontsize=7, style='italic', color='#666')
ax.text(13, 0.1, 'GitHub: pazussa/twAutomation', fontsize=7, style='italic', color='#666')

plt.tight_layout()

# Guardar el diagrama
output_path = '/home/user/newautomwpp/2/docs/Informe_pasantía/figures/architecture-diagram.png'
plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
print(f"✓ Diagrama guardado en: {output_path}")
print(f"✓ Resolución: 4800x3600 px (300 DPI)")
print(f"✓ Formato: PNG con fondo blanco")

# También mostrar en pantalla si es posible
try:
    plt.show()
except:
    print("(Modo no interactivo - solo guardado)")
