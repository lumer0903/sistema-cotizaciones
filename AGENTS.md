# Reglas de UI para apps/web

## Alcance
- Trabaja solo en apps/web. No toques apps/api, apps/ai-service ni packages/database.
- Haz únicamente lo que pida el prompt. Sin refactors ni reescrituras no pedidas.
- Rama: feat/ui-ux-mejoras. Un commit pequeño por punto (ej. "ui(a1): color semántico").
- Antes de editar, lista los archivos que vas a tocar. Al terminar, corre lint y typecheck de apps/web y reporta el resultado.

## Color
- Base neutra (blancos y grises). Un solo acento para la acción primaria: dorado de marca #f8b602.
- Sobre el dorado usa texto oscuro, nunca blanco (contraste insuficiente).
- Color solo con significado: rojo = vencido, error o destructivo; verde = éxito; ámbar = advertencia.
- Las categorías se muestran con un punto de color pequeño, sin fondo de color.
- Define los colores como tokens (Tailwind 4, @theme). No pongas hex sueltos en componentes.
- Verifica que lo urgente se distinga en escala de grises (por texto, peso y posición).

## Tipografía
- 12px etiquetas, 14px texto y botones, 20px títulos. Nunca menos de 12px.
- Prohibido text-[9px], text-[10px], text-[11px] y similares.
- Si el texto no cabe, recórtalo (line-clamp), no reduzcas la letra.
- Grises claros y legibles sobre fondos oscuros.

## Alineación y mayúsculas
- Texto alineado a la izquierda, no centrado, salvo títulos de una línea.
- Sin uppercase en subtítulos, labels ni meses. En español solo va mayúscula la primera letra.

## Botones
- Un solo botón primario por sección; los demás secundarios o ghost.
- Tres estados en acciones que guardan o crean: desactivado al presionar, "cargando" con spinner y texto, y confirmación con check y mensaje al terminar.
- Textos cortos: verbo + objeto.

## Voz de los textos
- Imperativo en tú: Ingresa, Guarda, Elimina. No uses infinitivo ni "¿Estás seguro?".

## Modales de confirmación
- Sin icono decorativo, alineado a la izquierda, con encabezado, contenido y acciones separados.
- Título = verbo + sustantivo ("Eliminar cotización"), no pregunta.
- El texto no repite el título: dice qué se pierde y que no hay vuelta atrás.
- El botón repite el verbo ("Eliminar"), acción principal a la derecha, y una X para cerrar.

## Formularios
- Label fijo arriba, placeholder solo con el formato, ayuda siempre visible debajo.
- El campo activo cambia de borde y de color de label.
