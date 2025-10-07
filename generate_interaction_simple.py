#!/usr/bin/env python3
"""
Diagrama de flujo simplificado - Interacción con WhatsApp Web
Versión minimalista y clara
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Ellipse

# Configurar figura más compacta
fig, ax = plt.subplots(figsize=(8, 10))
ax.set_xlim(0, 8)
ax.set_ylim(0, 10)
ax.axis('off')

# Colores
COLOR_START = '#81C784'  # Verde
COLOR_PROCESS = '#64B5F6'  # Azul
COLOR_IO = '#FF8A65'  # Naranja

def add_oval(ax, x, y, width, height, text, color):
    """Agrega un óvalo (inicio/fin)"""
    oval = Ellipse((x + width/2, y + height/2), width, height,
                   edgecolor='#263238', facecolor=color, linewidth=2.5)
    ax.add_patch(oval)
    ax.text(x + width/2, y + height/2, text,
            ha='center', va='center', fontsize=11, fontweight='bold')

def add_box(ax, x, y, width, height, text, color, fontsize=10):
    """Agrega un rectángulo (proceso)"""
    box = FancyBboxPatch((x, y), width, height,
                         boxstyle="round,pad=0.1",
                         edgecolor='#263238', facecolor=color, linewidth=2.5)
    ax.add_patch(box)
    ax.text(x + width/2, y + height/2, text,
            ha='center', va='center', fontsize=fontsize, wrap=True)

def add_arrow(ax, x1, y1, x2, y2):
    """Agrega una flecha simple"""
    arrow = FancyArrowPatch((x1, y1), (x2, y2),
                           arrowstyle='->,head_width=0.4,head_length=0.6',
                           color='#37474F', linewidth=2.5, mutation_scale=20)
    ax.add_patch(arrow)

# Título
ax.text(4, 9.6, 'Flujo de Interacción con WhatsApp Web',
        ha='center', fontsize=12, fontweight='bold')

# ============================================================================
# FLUJO SIMPLIFICADO
# ============================================================================

y_pos = 8.8
spacing = 1.3

# 1. Inicio
add_oval(ax, 2.5, y_pos, 3, 0.5, 'INICIO', COLOR_START)
add_arrow(ax, 4, y_pos, 4, y_pos - 0.3)
y_pos -= spacing

# 2. Login
add_box(ax, 1.5, y_pos, 5, 0.7, 'ensureLogin()\nAutenticar en WhatsApp Web', 
        COLOR_PROCESS, fontsize=10)
add_arrow(ax, 4, y_pos, 4, y_pos - 0.3)
y_pos -= spacing

# 3. Abrir chat
add_box(ax, 1.5, y_pos, 5, 0.7, 'openChat()\nAbrir conversación con el bot', 
        COLOR_PROCESS, fontsize=10)
add_arrow(ax, 4, y_pos, 4, y_pos - 0.3)
y_pos -= spacing

# 4. Limpiar chat
add_box(ax, 1.5, y_pos, 5, 0.7, 'clearChat()\nLimpiar historial', 
        COLOR_PROCESS, fontsize=10)
add_arrow(ax, 4, y_pos, 4, y_pos - 0.3)
y_pos -= spacing

# 5. Enviar mensaje
add_box(ax, 1.5, y_pos, 5, 0.7, 'typeIntoComposer()\nEnviar mensaje de prueba', 
        COLOR_IO, fontsize=10)
add_arrow(ax, 4, y_pos, 4, y_pos - 0.3)
y_pos -= spacing

# 6. Esperar respuesta
add_box(ax, 1.5, y_pos, 5, 0.7, 'waitFirstResponse()\nEsperar respuesta del bot', 
        COLOR_PROCESS, fontsize=10)
add_arrow(ax, 4, y_pos, 4, y_pos - 0.3)
y_pos -= spacing

# 7. Extraer respuesta
add_box(ax, 1.5, y_pos, 5, 0.7, 'getNewIncomingAfter()\nObtener mensajes recibidos', 
        COLOR_IO, fontsize=10)
add_arrow(ax, 4, y_pos, 4, y_pos - 0.3)
y_pos -= spacing

# 8. Fin
add_oval(ax, 2.5, y_pos, 3, 0.5, 'FIN', COLOR_START)

# ============================================================================
# LEYENDA MINIMALISTA
# ============================================================================
legend_y = 0.5
ax.text(0.5, legend_y + 0.3, 'Componentes:', fontsize=8, fontweight='bold')

# Óvalo
oval_leg = Ellipse((0.85, legend_y), 0.4, 0.2,
                   edgecolor='#263238', facecolor=COLOR_START, linewidth=2)
ax.add_patch(oval_leg)
ax.text(1.2, legend_y, 'Inicio/Fin', fontsize=7, va='center')

# Rectángulo proceso
rect_leg = mpatches.Rectangle((2.5, legend_y - 0.1), 0.4, 0.2,
                              edgecolor='#263238', facecolor=COLOR_PROCESS, linewidth=2)
ax.add_patch(rect_leg)
ax.text(3.05, legend_y, 'Proceso', fontsize=7, va='center')

# Rectángulo I/O
io_leg = mpatches.Rectangle((4.3, legend_y - 0.1), 0.4, 0.2,
                            edgecolor='#263238', facecolor=COLOR_IO, linewidth=2)
ax.add_patch(io_leg)
ax.text(4.85, legend_y, 'Entrada/Salida', fontsize=7, va='center')

plt.tight_layout()

# Guardar
output_path = '/home/user/newautomwpp/2/docs/Informe_pasantía/figures/interaction-flow.png'
plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
print(f"✓ Diagrama simplificado guardado en: {output_path}")
print(f"✓ Resolución: 2400x3000 px (300 DPI)")
print(f"✓ Tamaño: 8x10 pulgadas")
print(f"✓ Versión minimalista con 7 pasos principales")
