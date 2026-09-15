ESPECIFICACIÓN TÉCNICA Y DE DISEÑO DE INTERFACES (FRONTEND - BACKEND)
Sistema de Gestión de Inventario, Cotizaciones y Cobranzas

================================================================================
ÍNDICE
================================================================================
1. Módulo de Inventario y Registro de Productos
2. Módulo de Cotizaciones y Carrito de Compras
3. Módulo de Cobranzas, Pagos y Descuento de Stock
4. Módulo de Auditoría e Historial de Precios
5. Mapeo Global de Estados (UI vs. Backend)
6. Esquemas de Validación Frontend (Zod / TypeScript)

================================================================================
1. MÓDULO DE INVENTARIO Y REGISTRO DE PRODUCTOS
================================================================================

1.1 Formulario de Registro de Producto (AGREGAR_PRODUCTO)
El formulario captura la información básica del ítem, sus dimensiones, ubicación física en almacén y su estructura tarifaria por unidad de medida (Unidad, Docena, Caja) y tipo de cliente (Tienda, Distribuidor).

1.2 Auto-generación de Descripción
Para mantener consistencia en la base de datos y cumplir con las validaciones del backend, el campo 'descripcion' no se digita manualmente. El frontend concatena automáticamente los atributos seleccionados en tiempo real antes de realizar la petición POST /api/productos:

descripcion = [PRESENTACIÓN] + " " + [TIPO DE FLOR] + " " + [MATERIAL] + " x " + [N° CABEZAS] + " (" + [TAMAÑO] + ")"

Ejemplo: "Ramo Rosas Seda x 10 cabezas (10x20)"

1.3 Sub-modal "Configuración de Colores"
Debido a que los productos se reciben en presentación surtida (caja mixta) desde fábrica, no se gestiona stock independiente por color en la base de datos. El sub-modal sirve para registrar los colores que componen la mezcla para conocimiento del vendedor:

- Disparador: Botón [ Configurar ] ubicado en la fila del campo COLOR.
- Interfaz: Modal flotante que permite agregar etiquetas (tags) dinámicas (ej: Rojo, Blanco, Rosa, Amarillo).
- Mapeo a Estado: Los datos se almacenan localmente en el formulario para informar la composición de la caja surtida.

1.4 Manejo de Stocks, Almacenes y Costos
- Sedes Inactivas: Para cumplir con el DTO del backend sin habilitar la sede Tacna, el frontend envía siempre stock_tacna: 0.
- Stock Lima: Mapeado en stock_principal. El desplegable UBICACIÓN asigna el id_almacen correspondiente.
- Estrategia de Costos: Si los costos no se registran en pantalla, el frontend completa automáticamente los campos obligatorios costo_normal y costo_distribuidor con 0.00 o igualados al precio de venta.

================================================================================
2. MÓDULO DE COTIZACIONES Y CARRITO DE COMPRAS
================================================================================

2.1 Búsqueda y Creación Dinámica de Clientes (id_cliente)
1. Búsqueda Dinámica: En la sección Información General, un input Autocomplete realiza peticiones a GET /api/clientes?search={query} conforme el usuario escribe.
2. Cliente Existente: Si hay coincidencia, al seleccionar el cliente se autocompletan los campos (Email, Teléfono, Tipo de Precio) y se captura su id_cliente.
3. Cliente Nuevo: Si no existe registro, el vendedor llena los datos normalmente. Al presionar Guardar/Continuar, el frontend ejecuta primero un POST /api/clientes, recupera el id_cliente generado y lo vincula al POST /api/cotizaciones.

2.2 Selección de Productos y Regla Comercial de Color (AGREGAR_P_COTI)
Al agregar un producto a la cotización, la selección del tipo de venta por color aplica reglas dinámicas sobre el precio y los avisos de stock:

- Surtido:
  * Recargo: S/ 0.00 (Precio base)
  * Estado de Stock en UI: En blanco / Normal
  * Campo color_notas: "Surtido"

- Color Específico:
  * Recargo: + S/ 2.00 por unidad
  * Estado de Stock en UI: "Requiere conteo en almacén"
  * Campo color_notas: "Color Específico: [Color] (+S/2.00)"

Alerta en UI: Si se elige Color Específico, el campo Estado de Stock pasa a modo solo lectura mostrando la alerta de conteo físico, y se añade un badge indicando el recargo de (+ S/ 2.00 x un.).

2.3 Fórmulas de Cálculo
1. Precio Unitario Final (Línea) = Precio Base (según Tipo de Venta) + Recargo Color (S/ 2.00 si aplica)
2. Subtotal del Ítem (Línea) = Precio Unitario Final * Cantidad
3. Total General de Cotización = Suma de Subtotales de todos los Ítems

================================================================================
3. MÓDULO DE COBRANZAS, PAGOS Y DESCUENTO DE STOCK
================================================================================

3.1 Modalidades de Pago y Gestión de Stock (REGISTRAR_PAGO)
El registro de abonos y liquidación de pagos soporta dos flujos operativos principales:

Cotización Enviada (enviada)
 ├─► Pago Completo (100%) ────────────────► (aprobada) ──► Descuenta Stock
 └─► Primer Abono Parcial (< 100%) ────────► (parcialmente_pagada) ──► Descuenta Stock
                                                  │
                                          Abono Final (Completa 100%)
                                                  │
                                                  ▼
                                              (aprobada)

- Pago Completo (100% en una transacción):
  * Si el monto ingresado cancela la totalidad del saldo pendiente desde el primer registro, el estado de la cotización pasa directamente a 'aprobada' (y en cobranza a 'pagada').
  * Ejecuta de inmediato el descuento de stock en la base de datos.

- Pago Parcial (Abonos Fraccionados):
  * Primer Abono (< 100%): La cotización cambia su estado a 'parcialmente_pagada' (y en cobranza a 'parcial'). En este primer abono se ejecuta el descuento/reserva automática del stock en inventario.
  * Abonos Sucesivos: Registra los ingresos reduciendo el saldo pendiente.
  * Abono Final (Saldo = S/ 0.00): Al completar el 100% del total de la cotización, el estado se actualiza automáticamente a 'aprobada' ('pagada').

3.2 Corrección de Estructura Visual en Historial de Abonos
La tabla que muestra el desglose de abonos en el modal de cobranza debe mantener el siguiente orden estricto de columnas:

FECHA      | MONTO     | MÉTODO   | REFERENCIA
-----------+-----------+----------+-------------
10/09/2026 | S/ 300.00 | EFECTIVO | OP-100293
12/09/2026 | S/ 200.00 | YAPE     | OP-565656565

================================================================================
4. MÓDULO DE AUDITORÍA E HISTORIAL DE PRECIOS
================================================================================

Para dar trazabilidad a las modificaciones de precios por ítem (HISTORIAL_PRECIO), el modal expone los 5 campos requeridos por el backend (GET /api/historial-precios):

1. CAMPO MODIFICADO: Tarifa específica que sufrió la variación (ej: Docena Distrib., Unidad Tienda, Mayor Distrib.).
2. FECHA DE CAMBIO: Fecha y hora del evento (DD/MM/YYYY).
3. USUARIO: Nombre del usuario autenticado que realizó el cambio.
4. VALOR ANTERIOR: Precio registrado previo a la edición (ej: S/ 50.00).
5. VALOR NUEVO: Precio actualizado guardado en la base de datos (ej: S/ 45.00).

================================================================================
5. MAPEO GLOBAL DE ESTADOS (UI VS. BACKEND)
================================================================================

Etapa Operativa     | Estado Cotizaciones (UI) | Estado Cobranza (UI) | Condición para Cambio
--------------------+--------------------------+----------------------+----------------------------------------------------
Creación            | borrador                 | -                    | Cotización guardada sin enviar al cliente.
Envío               | enviada                  | pendiente            | Cotización formalizada y enviada al cliente.
Abono Parcial       | parcialmente_pagada      | parcial              | Registro del primer pago por un monto menor al total.
Pago Total          | aprobada                 | pagada               | Cancelación del 100% del saldo (directo o por abono final).

================================================================================
6. ESQUEMAS DE VALIDACIÓN FRONTEND (ZOD / TYPESCRIPT)
================================================================================

import { z } from "zod";

// 1. ESQUEMA: REGISTRO DE PRODUCTO
export const CrearProductoSchema = z.object({
  codigo: z.string().min(2, "El código es obligatorio"),
  categoria: z.string().min(1, "Seleccione una categoría"),
  tipo_flor: z.string().min(1, "Seleccione el tipo de flor"),
  material: z.string().min(1, "Seleccione el material"),
  composicion: z.string().min(1, "Seleccione la composición"),
  presentacion: z.string().min(1, "Seleccione la presentación"),
  numero_cabezas: z.number().min(1, "Ingrese el número de cabezas"),
  tamano: z.string().min(1, "Ingrese el tamaño"),
  id_almacen: z.string().uuid("Seleccione una ubicación válida"),
  unidades_por_caja: z.number().min(1, "Ingrese unidades por caja"),
  stock_principal: z.number().min(0, "El stock no puede ser negativo"),
  stock_minimo: z.number().min(0, "El stock mínimo no puede ser negativo"),
  stock_tacna: z.number().default(0),
  descripcion: z.string().min(5),
  colores_surtido: z.array(z.string()).min(1, "Configure al menos un color para el surtido"),
  
  precio_tienda_unidad: z.number().positive(),
  precio_tienda_docena: z.number().positive(),
  precio_tienda_caja: z.number().positive(),
  precio_distribuidor_unidad: z.number().positive(),
  precio_distribuidor_docena: z.number().positive(),
  precio_distribuidor_caja: z.number().positive(),
  
  costo_normal: z.number().default(0),
  costo_distribuidor: z.number().default(0)
});

// 2. ESQUEMA: AGREGAR PRODUCTO A COTIZACIÓN
export const AgregarProductoCotizacionSchema = z.object({
  id_producto: z.string().uuid(),
  tipo_color: z.enum(["surtido", "especifico"]),
  color_seleccionado: z.string().optional(),
  tipo_venta: z.enum(["unidad", "docena", "caja"]),
  cantidad: z.number().min(1, "La cantidad debe ser mayor a 0"),
  precio_base: z.number().positive("El precio base debe ser mayor a 0"),
  recargo_color: z.number().default(0),
  precio_unitario_final: z.number().positive(),
  subtotal: z.number().positive(),
  color_notas: z.string()
}).refine((data) => {
  if (data.tipo_color === "especifico" && !data.color_seleccionado) {
    return false;
  }
  return true;
}, {
  message: "Debe seleccionar un color si opta por 'Color Específico'",
  path: ["color_seleccionado"]
});

// 3. ESQUEMA: REGISTRO DE PAGO / ABONO
export const RegistrarPagoSchema = (saldoPendiente: number) =>
  z.object({
    id_cotizacion: z.string().uuid(),
    monto: z
      .number()
      .positive("El monto debe ser mayor a 0")
      .max(
        saldoPendiente,
        `El monto abonado (S/ ${saldoPendiente}) no puede exceder el saldo pendiente`
      ),
    metodo_pago: z.enum(["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "TARJETA"]),
    numero_operacion: z.string().min(3, "Ingrese el número de operación o referencia"),
    comprobante_url: z.string().optional()
  });

export type CrearProductoInput = z.infer<typeof CrearProductoSchema>;
export type AgregarProductoCotizacionInput = z.infer<typeof AgregarProductoCotizacionSchema>;
export type RegistrarPagoInput = z.infer<ReturnType<typeof RegistrarPagoSchema>>;
