\pset pager off
BEGIN;
CREATE TEMP TABLE audit_catalog (LIKE productos INCLUDING ALL) ON COMMIT DROP;
INSERT INTO audit_catalog(id_producto,codigo,descripcion,created_at,updated_at) SELECT g,'BENCH-'||g,CASE WHEN g % 100=0 THEN 'ROSA_SELECTIVA' ELSE 'OTRO_CATALOGO' END,now()-(g||' seconds')::interval,now() FROM generate_series(1,100) g;
ANALYZE audit_catalog;
\echo CATALOGO_100_BUSQUEDA_SELECTIVA
EXPLAIN (ANALYZE,BUFFERS) SELECT id_producto FROM audit_catalog WHERE deleted_at IS NULL AND (codigo ILIKE '%ROSA_SELECTIVA%' OR descripcion ILIKE '%ROSA_SELECTIVA%') ORDER BY created_at DESC LIMIT 50;
INSERT INTO audit_catalog(id_producto,codigo,descripcion,created_at,updated_at) SELECT g,'BENCH-'||g,CASE WHEN g % 100=0 THEN 'ROSA_SELECTIVA' ELSE 'OTRO_CATALOGO' END,now()-(g||' seconds')::interval,now() FROM generate_series(101,10000) g;
ANALYZE audit_catalog;
\echo CATALOGO_10000_BUSQUEDA_SELECTIVA
EXPLAIN (ANALYZE,BUFFERS) SELECT id_producto FROM audit_catalog WHERE deleted_at IS NULL AND (codigo ILIKE '%ROSA_SELECTIVA%' OR descripcion ILIKE '%ROSA_SELECTIVA%') ORDER BY created_at DESC LIMIT 50;
\echo CATALOGO_10000_BUSQUEDA_CORTA
EXPLAIN (ANALYZE,BUFFERS) SELECT id_producto FROM audit_catalog WHERE deleted_at IS NULL AND (codigo ILIKE '%RO%' OR descripcion ILIKE '%RO%') ORDER BY created_at DESC LIMIT 50;
\echo CATALOGO_10000_OFFSET_9000
EXPLAIN (ANALYZE,BUFFERS) SELECT id_producto FROM audit_catalog WHERE deleted_at IS NULL ORDER BY created_at DESC OFFSET 9000 LIMIT 50;
ROLLBACK;
