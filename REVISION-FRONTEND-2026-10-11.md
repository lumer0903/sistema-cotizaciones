# Revisión del frontend — 11 de octubre de 2026

Regla confirmada por el usuario: administrador y gerente amarillos; vendedor rojo.

## Correcciones realizadas

- Centralizados los acentos en tokens CSS por sesión. Botones, selección, paginación, campos, pestañas, paneles y foco consumen el mismo tema. La raíz HTML transmite el tema a los componentes que usan portales.
- Administrador y gerente comparten amarillo #F8B602 con texto #18181B; vendedor usa rojo #7B1C1C con texto blanco. Los estados y segmentos comerciales conservan sus colores semánticos.
- Migradas las tablas de Roles y Permisos y del dashboard al componente global Table. En src, únicamente Table.tsx declara etiquetas table/thead/tbody.
- Migradas las pestañas de usuarios al componente global Tabs. Corregidos enlaces ARIA, navegación con teclado y omisión de opciones deshabilitadas.
- Corregida la mezcla de estilos de celdas que perdía el espaciado global al recibir style.
- Uniformadas tipografía y variables de gráficos, indicadores y paneles auxiliares.
- Ocultadas altas, movimientos y transferencias de inventario cuando el permiso de productos es lectura.
- El layout valida acceso por URL directa contra el catálogo de permisos; crear/editar cotizaciones requieren edición y PDF requiere su permiso. Una denegación no monta la página hija. El backend conserva la responsabilidad de autorizar cada operación.

## Verificación

- TypeScript sin errores.
- Compilación de producción Next.js aprobada.
- 121 pruebas del frontend aprobadas, incluidas dos nuevas pruebas de accesibilidad de Tabs.
- ESLint sin errores; permanecen dos advertencias existentes por img en ImageUploader y PriceCard.
- Navegador Chromium con sesiones y respuestas API simuladas: comprobados los tres roles a 1440 px y 390 px. Inventario sin desbordamiento horizontal de documento. Colores calculados del botón principal coinciden con la regla.
- Verificado que un usuario con productos en lectura no ve Agregar Producto y que usuarios sin acceso muestra Acceso restringido.
- Capturas en revision-frontend/. Incluyen un modal de producto; los datos vacíos de inventario corresponden a fixtures, no a un inventario real vacío.

## Límites y pendientes detectados

La revisión estática cubre el código del frontend; la verificación visual se concentra en inventario, navegación y modal, con sesiones simuladas. No constituye una prueba integral de todos los flujos contra la base de datos real ni una certificación completa WCAG.

Configuración ofrece tema oscuro/idioma y un botón Restablecer sin una aplicación completa visible en el frontend; estas funciones requieren completar su comportamiento antes de considerarlas cumplidas. Quedan contenedores y controles específicos fuera de Card/Button: la reutilización global mejoró, pero no corresponde afirmar que el 100 % del diseño usa componentes globales. También conviene revisar todos los formularios de escritura en modo lectura (especialmente cobranza/configuración) como una siguiente auditoría funcional.

Cambios locales; no publicados.
