# Plan Maestro de Arquitectura e Implementación: Sistema GoldContinent

## 1. Contexto del Proyecto y Objetivos Académicos (Tesis)

### 1.1 Visión General
**GoldContinent** es un sistema integral de gestión comercial, control de inventario multialmacén y cotización inteligente desarrollado en un monorepo (**Next.js + NestJS + Prisma + PostgreSQL**). El sistema está diseñado para optimizar el flujo operativo comercial (Quote-to-Cash), reducir tiempos de atención, auditar variaciones de precios y maximizar la conversión de ventas mediante un motor de recomendaciones con inteligencia comercial.

### 1.2 Indicadores de Rendimiento (KPIs Académicos para la Tesis)
El sistema recolectará y procesará datos en tiempo real para medir el impacto de la herramienta:

1. **Tasa de Conversión de Cotizaciones ($TC$):**
   $$\text{TC} = \left( \frac{\text{Cotizaciones aprobadas}}{\text{Cotizaciones creadas (enviadas + aprobadas + rechazadas)}} \right) \times 100$$
2. **Efectividad del Recomendador IA ($E_{\text{IA}}$):**
   $$\text{E}_{\text{IA}} = \left( \frac{\text{Ítems con } \texttt{es\_sugerido\_ia} = \text{true en cotizaciones aprobadas}}{\text{Total de ítems en cotizaciones aprobadas}} \right) \times 100$$
3. **Tiempo Promedio de Cotización ($T_{\text{prom}}$):**
   $$T_{\text{prom}} = \text{Promedio}(\texttt{tiempo\_fin} - \texttt{tiempo\_inicio})$$
4. **Nivel de Servicio de Inventario ($N_s$):**
   Mantiene el control de quiebres de stock mediante el monitoreo de la tabla `alertas_stock` vs. `stock_minimo`.

---

## 2. Modelado de Negocio y Flujos Operativos

### 2.1 Precios e Historial de Auditoría
* **Estructura de Precios (`PreciosActuales`):**
  * Soporta dos tipos de cliente: `normal` y `distribuidor`.
  * Soporta tres escalas de venta: `unidad`, `docena` y `mayor`.
* **Auditoría (`HistorialPrecios`):**
  * Cada cambio de precio genera un registro inmutable vinculando: `id_producto`, `id_usuario`, `campo_modificado`, `valor_anterior`, `valor_nuevo` y `fecha_cambio`.

### 2.2 Inventario Multialmacén y Kardex
* **Almacenes:** `stock_principal` y `stock_tacna` centralizados en `StockActual`.
* **Kardex (`InventarioMovimiento`):**
  * Tipos: `entrada`, `salida`, `ajuste`, `transferencia`.
  * Orígenes: `compra`, `venta`, `devolucion_cliente`, `ajuste_fisico`, `merma`, `transferencia`, `cotizacion_aprobada`.
* **Descuento Automático:** La aprobación de una cotización (`estado = aprobada`) genera automáticamente movimientos de salida tipo `cotizacion_aprobada`.

### 2.3 Cotizaciones y Motor de Recomendación por Ítem
* **Estados de Cotización:**
  * `borrador`: Edición libre, prueba de recomendaciones. No afecta stock.
  * `enviada`: Cotización finalizada enviada al cliente. Registra `tiempo_fin`.
  * `aprobada`: Cliente confirma. Genera la `Venta`, descuenta stock y registra cuenta por cobrar si es crédito.
  * `rechazada`: Cotización declinada por el cliente.
* **Flujo de Sugerencia sobre Producto Base:**
  1. El vendedor agrega un producto a la cotización.
  2. En la fila del producto presiona el botón **`✨ Sugerir`**.
  3. El sistema abre un modal que consulta el backend y presenta **3 Opciones**:
     * **Más Similar:** Coincidencia exacta o más cercana en especificaciones/categoría.
     * **Mejor Opción (Upsell):** Producto de mayor gama o mejor margen.
     * **Equilibrio (Best Value):** Mejor relación costo-beneficio con stock garantizado.
  4. **Acciones del Vendedor:**
     * **`🔄 Reemplazar`:** Elimina el producto base e inserta la recomendación (`es_sugerido_ia = true`).
     * **`➕ Agregar nuevo`:** Conserva el producto base y añade el recomendado (`es_sugerido_ia = true`).

---

## 3. Plan de Implementación Backend (NestJS + Prisma)

### Fase B1: Módulo de Precios y Auditoría
* **[ ] Controller & Service (`/api/productos/precios`):**
  * Endpoint `PATCH /api/productos/:id/precios` para actualizar `PreciosActuales`.
  * Disparador (transaction en Prisma) para insertar en `HistorialPrecios` por cada campo modificado.
  * Endpoint `GET /api/productos/:id/historial-precios` para consulta de auditoría.

### Fase B2: Módulo de Inventario y Kardex
* **[ ] Controller & Service (`/api/inventario`):**
  * Endpoint `POST /api/inventario/movimientos` para registrar Entradas, Salidas y Ajustes manuales.
  * Endpoint `GET /api/inventario/kardex/:id_producto` para consultar historial de movimientos.
  * Lógica para actualizar `StockActual` de forma atómica.

### Fase B3: Motor de Recomendación por Ítem
* **[ ] Endpoint (`POST /api/cotizaciones/recomendar-item`):**
  * Recibe: `id_producto_base`, `id_cliente` (para determinar `tipo_precio`), `id_almacen`.
  * Ejecuta consulta de similitud y filtros de stock/categoría.
  * Retorna estructura JSON con las 3 tarjetas (`similar`, `upsell`, `equilibrio`), incluyendo desglose de stock y precio aplicable (`normal` vs `distribuidor`).
  * Inserta auditoría en `IaInteracciones`.

### Fase B4: Ciclo de Cotizaciones y Cambio de Estados
* **[ ] Controller & Service (`/api/cotizaciones`):**
  * Endpoint `POST /api/cotizaciones` (Crea en `borrador` con timestamp `tiempo_inicio`).
  * Endpoint `PATCH /api/cotizaciones/:id/estado`:
    * Cambia a `enviada`: Establece `tiempo_fin`.
    * Cambia a `aprobada`: Genera `Venta`, descuenta stock en `InventarioMovimiento` (`origen = cotizacion_aprobada`) y genera `CuentaCobrar` si `tipoPago = credito`.
    * Cambia a `rechazada`: Actualiza estado.

### Fase B5: Endpoints para KPIs del Dashboard
* **[ ] Endpoint (`GET /api/dashboard/kpis`):**
  * Transacciones de agregación en Prisma para calcular $TC$, $E_{\text{IA}}$, $T_{\text{prom}}$ y lista de alertas de stock.

---

## 4. Plan de Implementación Frontend (Next.js)

### Fase F1: Módulo de Productos e Historial de Precios
* **[ ] Vista de Producto & Precios:**
  * Tabla con matriz de precios (`Normal` vs `Distribuidor` x `Unidad`, `Docena`, `Mayor`).
  * Componente/Modal `<HistorialPreciosModal />` que muestra la línea de tiempo de cambios con fechas, usuario y valores.

### Fase F2: Control de Inventario Visual
* **[ ] Vista de Almacén y Kardex:**
  * Formulario de Entrada/Salida/Ajuste de Stock.
  * Tabla de movimientos de Kardex con filtros por rango de fecha, almacén y tipo de movimiento.

### Fase F3: Tabla de Cotizaciones y Botón `✨ Sugerir`
* **[ ] Componente `<CotizadorTable />`:**
  * Fila de ítem con selector de producto, cantidad, tipo de venta y subtotal.
  * Botón **`✨ Sugerir`** destacado en las acciones de cada fila.
  * Captura automática de `tiempo_inicio` al crear borrador.

### Fase F4: Modal Contextual de Recomendaciones (3 Tarjetas)
* **[ ] Componente `<RecomendadorModal />`:**
  * Se activa al hacer clic en `✨ Sugerir`.
  * Visualización de 3 Tarjetas (`Más Similar`, `Mejor Opción`, `Equilibrio`).
  * Muestra badges de stock por almacén y precio ajustado según el cliente seleccionado.
  * Botones de acción: **`🔄 Reemplazar`** y **`➕ Agregar nuevo`**.
  * Al hacer clic, actualiza el estado global de la cotización (`useQuoteStore`) marcando `es_sugerido_ia = true`.

### Fase F5: Dashboard de Tesis
* **[ ] Vista `<DashboardKPIs />`:**
  * Tarjetas métricas: Tasa de Conversión, Aceptación IA %, Tiempo Promedio, Alertas Activas.
  * Gráficos comparativos de Cotizado vs Vendido y Alertas de Stock Bajo.

---

## 5. Cronograma de Trabajo Recomendado

1. **Paso 1 (Backend & Base de Datos):** Implementar endpoints de Precios, Historial y Recomendación por Ítem.
2. **Paso 2 (Frontend Cotizador):** Integrar el botón `✨ Sugerir` y el `<RecomendadorModal />` en la vista de cotizaciones.
3. **Paso 3 (Backend & Frontend Inventario):** Flujo de aprobación de cotización (`cotizacion_aprobada`) y descuento automático de Kardex.
4. **Paso 4 (Dashboard & Tesis):** Conectar métricas y KPIs analíticos.
