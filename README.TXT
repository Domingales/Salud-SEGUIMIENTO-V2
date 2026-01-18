========================================
APP SALUD – REGISTRO, SEGUIMIENTO Y GRÁFICOS
========================================

DESCRIPCIÓN GENERAL
-------------------
Esta aplicación permite registrar y hacer un seguimiento básico de datos de salud
de una o varias personas (pacientes), almacenando mediciones a lo largo del tiempo,
generando un informe orientativo y mostrando gráficos de evolución por concepto.

La app funciona 100% en local (no envía datos a internet) y está pensada como una
herramienta de apoyo y seguimiento personal, NO como sustituto de un profesional
sanitario.

------------------------------------------------

FUNCIONALIDADES PRINCIPALES
---------------------------
1) Gestión de pacientes
• Crear fichas de pacientes con:
  - Nombre
  - Edad
  - Sexo
  - Altura (cm) (para calcular IMC)
  - Medicación (texto libre)

2) Registros de salud (por fecha/hora)
En cada registro se guardan:
• Obligatorios:
  - Peso (kg)
  - Tensión arterial: Sistólica (Tensión A) / Diastólica (Tensión B)
  - Frecuencia cardiaca (lpm)
• Opcionales:
  - SpO₂ (%) (saturación de oxígeno)
  - Glucosa (mg/dL) + Contexto (Ayunas / Casual / Sin indicar)
  - Notas (texto libre)

IMPORTANTE: si un dato opcional NO se introduce, se considera DESCONOCIDO.
La app NO asume 0 ni “rellena” valores. Si no hay dato, no hay cálculo ni
interpretación para ese apartado.

3) Edición y borrado
• En la lista de registros puedes:
  - EDITAR un registro existente (corregir valores/fecha/notas)
  - ELIMINAR un registro

4) Informe médico (orientativo)
• Genera un informe automático basado EXCLUSIVAMENTE en los datos introducidos:
  - Estado actual según los datos disponibles
  - Mejoras detectadas (si hay suficientes registros)
  - Empeoramientos detectados (si los hay)
  - Consejos generales coherentes con los datos disponibles
• Si falta información relevante (ej. altura para IMC, o contexto de glucosa),
  la app lo indicará y no hará interpretaciones sobre ese punto.

5) Glosario “¿Qué es…?”
• Botón “¿Qué es…?” con un desplegable de términos usados por la app (por ejemplo:
  HTA grado 1, IMC, SpO₂, bradicardia, etc.) y explicación en lenguaje claro:
  - Definición
  - Por qué importa
  - Qué hacer (orientativo)

6) Gráficos de evolución
• Botón “Gráfico” para ver la evolución temporal por concepto.
• Métricas disponibles:
  - Tensión arterial (Sistólica y Diastólica en dos líneas)
  - Peso
  - IMC (requiere altura)
  - Frecuencia cardiaca
  - SpO₂ (si hay datos)
  - Glucosa (si hay datos)
• Si un dato está ausente en un registro, se omite del trazado (no se interpreta
  como 0). Si no hay datos suficientes, el gráfico lo indicará.

7) Exportación / Importación
• Exportación:
  - Backup completo en JSON
  - Exportar a TXT (informe y/o registros)
  - Exportar a CSV (para Excel)
  - Copiar a Excel (portapapeles)
  - Imprimir / generar PDF desde el navegador
• Importación:
  - Importar un backup JSON previamente exportado

8) Ajustes y apariencia
• Permite elegir:
  - Posición del panel (izquierda/derecha)
  - Colores del tema (fondo, panel, texto, etc.)
• Botón “Restaurar ajustes”:
  - Devuelve la configuración a los valores originales (tema + posición).

------------------------------------------------

CÓMO USAR LA APP (PASO A PASO)
------------------------------
1. Abre el archivo `index.html` con tu navegador (Chrome o Edge recomendado).
2. Pulsa “Añadir” para crear un paciente.
3. Selecciona el paciente desde el desplegable.
4. Pulsa “Añadir registro” para introducir nuevas mediciones (fecha actual o la que elijas).
5. Para corregir un registro, pulsa “Editar” en su fila y guarda los cambios.
6. Pulsa “Informe médico” para ver el resumen interpretativo.
7. Pulsa “Gráfico” para ver la evolución de cada métrica.
8. Si no entiendes un término del informe, pulsa “¿Qué es…?” y selecciónalo.
9. Haz copias de seguridad periódicas con “Exportar JSON”.

------------------------------------------------

ALMACENAMIENTO Y COPIAS DE SEGURIDAD
------------------------------------
• Los datos clínicos se guardan en IndexedDB (más capacidad que localStorage).
• Los ajustes se guardan en localStorage (son pequeños).
• Recomendación:
  - Exporta un backup JSON semanalmente o antes de hacer cambios importantes.

------------------------------------------------

ACLARACIÓN IMPORTANTE (SALUD)
-----------------------------
El informe y las etiquetas (por ejemplo “HTA grado 1”) son orientativos y
automatizados. No constituyen un diagnóstico médico.

Si aparecen valores muy elevados, síntomas preocupantes o dudas, consulta con un
profesional sanitario.

------------------------------------------------

PRIVACIDAD
----------
• Todos los datos se guardan únicamente en tu dispositivo.
• La app no envía información a internet.
• El usuario es responsable de proteger el equipo y las copias de seguridad.

------------------------------------------------

REQUISITOS TÉCNICOS
-------------------
• Navegador moderno (Chrome, Edge, Firefox).
• La app funciona sin internet.
• En algunos entornos, si abres desde ruta file:/// y tu navegador limita almacenamiento,
  puedes usar un servidor local (por ejemplo “Live Server” en VS Code).

------------------------------------------------

FIN DEL DOCUMENTO
-----------------
