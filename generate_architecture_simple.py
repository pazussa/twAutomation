#!/usr/bin/env python3
"""
Diagrama simplificado de arquitectura del proyecto
Versión limpia y legible para documentos impresos
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

# Configurar figura compacta
fig, ax = plt.subplots(figsize=(10, 7))
ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.axis('off')

# Colores definidos
COLOR_EXTERNAL = '#90CAF9'  # Azul
COLOR_CORE = '#FFD54F'      # Amarillo
COLOR_DATA = '#AED581'      # Verde
COLOR_TESTS = '#F48FB1'     # Rosa
COLOR_REPORT = '#CE93D8'    # Púrpura
COLOR_ADMIN = '#4DB6AC'     # Turquesa

def add_box(ax, x, y, width, height, text, color, fontsize=10, bold=False):
    """Agrega una caja con texto"""
    box = FancyBboxPatch((x, y), width, height,
                         boxstyle="round,pad=0.1",
                         edgecolor='#263238',
                         facecolor=color,
                         linewidth=2)
    ax.add_patch(box)
    
    weight = 'bold' if bold else 'normal'
    ax.text(x + width/2, y + height/2, text,
            ha='center', va='center',
            fontsize=fontsize, fontweight=weight)

def add_arrow(ax, x1, y1, x2, y2, label='', color='#37474F'):
    """Agrega una flecha entre dos puntos"""
    arrow = FancyArrowPatch((x1, y1), (x2, y2),
                           arrowstyle='->,head_width=0.4,head_length=0.8',
                           color=color,
                           linewidth=2.5,
                           mutation_scale=20)
    ax.add_patch(arrow)
    
    if label:
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mid_x + 0.3, mid_y, label,
                ha='center', va='center',
                fontsize=8, fontweight='bold', style='italic',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', 
                         edgecolor='gray', linewidth=1))

# Título
ax.text(5, 6.7, 'Arquitectura del Framework de Automatización',
        ha='center', fontsize=13, fontweight='bold')

# ============================================================================
# CAPA 1: WHATSAPP WEB
# ============================================================================
add_box(ax, 3.5, 5.8, 3, 0.65, 'WhatsApp Web\nBot Agrícola', 
        COLOR_EXTERNAL, fontsize=11, bold=True)

# ============================================================================
# CAPA 2: PLAYWRIGHT
# ============================================================================
add_box(ax, 3.5, 4.9, 3, 0.6, 'Playwright\nChromium Persistente', 
        COLOR_CORE, fontsize=10, bold=True)

# ============================================================================
# CAPA 3: FRAMEWORK CORE
# ============================================================================
add_box(ax, 0.3, 3.5, 2.8, 1, 
        'utils.ts\nPage Objects\n\nInteracciones\ncon WhatsApp', 
        COLOR_CORE, fontsize=9)

add_box(ax, 3.6, 3.5, 2.8, 1,
        'flow.ts\nOrquestación\n\nrunAutoLoop()\ndetectActionFrom()',
        COLOR_CORE, fontsize=9)

add_box(ax, 6.9, 3.5, 2.8, 1,
        'data.ts\nDatos\n\n29 Intents\n942 Variaciones',
        COLOR_DATA, fontsize=9)

# ============================================================================
# CAPA 4: ESPECIFICACIONES
# ============================================================================
add_box(ax, 0.3, 2.3, 9.4, 0.8,
        '30 Especificaciones de Prueba (.spec.ts)\nConsultas  •  Creaciones  •  Campañas',
        COLOR_TESTS, fontsize=10, bold=True)

# ============================================================================
# CAPA 5: REPORTES Y ADMINISTRACIÓN
# ============================================================================
add_box(ax, 0.3, 0.7, 4.5, 1.2,
        'Sistema de Reportes\n\nconversation-reporter.ts\nexport-to-pdf.mjs\n\nHTML → PDF',
        COLOR_REPORT, fontsize=9)

add_box(ax, 5.2, 0.7, 4.5, 1.2,
        'Panel de Administración\n\nExpress Server :3000\nCRUD Intents\nEjecución Selectiva',
        COLOR_ADMIN, fontsize=9)

# ============================================================================
# FLECHAS PRINCIPALES
# ============================================================================

# WhatsApp -> Playwright
add_arrow(ax, 5, 5.8, 5, 5.5)

# Playwright -> Framework Core
add_arrow(ax, 4.5, 4.9, 1.7, 4.5)
add_arrow(ax, 5, 4.9, 5, 4.5)
add_arrow(ax, 5.5, 4.9, 8.3, 4.5)

# Framework -> Tests
add_arrow(ax, 1.7, 3.5, 2.5, 3.1, label='ejecuta')
add_arrow(ax, 5, 3.5, 5, 3.1)
add_arrow(ax, 8.3, 3.5, 7.5, 3.1)

# Tests -> Reportes
add_arrow(ax, 2.5, 2.3, 2.5, 1.9, label='registra')

# Admin -> Data (gestión)
add_arrow(ax, 7.5, 1.9, 8.3, 3.5, label='gestiona')

# ============================================================================
# LEYENDA
# ============================================================================
legend_y = 0.25
ax.text(0.3, legend_y, 'Componentes:', fontsize=7, fontweight='bold')

legend_items = [
    (COLOR_EXTERNAL, 'Externo'),
    (COLOR_CORE, 'Core'),
    (COLOR_DATA, 'Datos'),
    (COLOR_TESTS, 'Tests'),
    (COLOR_REPORT, 'Reportes'),
    (COLOR_ADMIN, 'Admin')
]

for i, (color, label) in enumerate(legend_items):
    x_pos = 1.5 + i * 1.35
    
    small_box = mpatches.Rectangle((x_pos, legend_y - 0.05), 0.2, 0.12,
                                   edgecolor='#263238',
                                   facecolor=color,
                                   linewidth=1.5)
    ax.add_patch(small_box)
    ax.text(x_pos + 0.28, legend_y + 0.01, label, fontsize=6.5, va='center')

plt.tight_layout()

# Guardar diagrama simplificado
output_path = '/home/user/newautomwpp/2/docs/Informe_pasantía/figures/architecture-diagram.png'
plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
print(f"✓ Diagrama simplificado guardado en: {output_path}")
print(f"✓ Resolución: 3000x2100 px (300 DPI)")
print(f"✓ Tamaño de figura: 10x7 pulgadas")
print(f"✓ Versión optimizada para documentos impresos")
