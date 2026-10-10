BEGIN;

DELETE FROM inventario_movimientos;
DELETE FROM stock_actual;
DELETE FROM precios_actuales;
DELETE FROM historial_precios;
DELETE FROM alertas_stock;
DELETE FROM cotizacion_detalle;
DELETE FROM cotizacion_pagos;
DELETE FROM cotizaciones;
DELETE FROM clientes;
DELETE FROM productos;

COMMIT;