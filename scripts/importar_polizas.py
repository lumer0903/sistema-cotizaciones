import os
import glob
import re
import pandas as pd
from datetime import datetime
import psycopg2

DB_CONFIG = {
    "dbname": "postgres",
    "user": "postgres",
    "password": "root",
    "host": "localhost",
    "port": "5432"
}

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FOLDER_PATH = os.path.join(PROJECT_ROOT, 'archivos_excel')

def clean_code(val):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if not s or s.upper() in ['NAN', 'NONE', 'CODIGO', 'CÓDIGO', 'TOTAL', 'FOTO', 'ITEM', 'DESCRIPCION']:
        return None
    return s

def clean_str(val, fallback=None):
    if pd.isna(val) or val is None:
        return fallback
    s = str(val).strip()
    return s if s and s.upper() not in ['NAN', 'NONE', '-', ''] else fallback

def parse_num(val):
    if pd.isna(val) or val is None:
        return 0.0
    val_str = str(val).replace('S/', '').replace('$', '').replace(' ', '').strip()
    if not val_str or val_str.upper() in ['-', 'NAN', 'NONE']:
        return 0.0
    if ',' in val_str and '.' in val_str:
        val_str = val_str.replace(',', '')
    elif ',' in val_str and '.' not in val_str:
        val_str = val_str.replace(',', '.')
    try:
        return float(val_str)
    except Exception:
        return 0.0

def categorizar_producto(desc, pres, comp, flor):
    text = f"{desc or ''} {pres or ''} {comp or ''} {flor or ''}".upper()
    if any(k in text for k in ['PLATO', 'PORCELANA', 'VAJILLA', 'TAZA', 'COPA', 'MENAJE']):
        return 'VAJILLA Y MENAJE'
    elif any(k in text for k in ['PEDESTAL', 'MACETA', 'FLORERO', 'BASE', 'MESA']):
        return 'DECORACIÓN Y BASE'
    elif any(k in text for k in ['NAVIDAD', 'NAVIDEÑO', 'CORONA', 'ESFERA']):
        return 'NAVIDAD Y TEMPORADA'
    elif any(k in text for k in ['VARA', 'RAMO', 'GUIRNALDA', 'HOJA', 'FOLLAJE', 'BOUQUET', 'PLANT', 'ÁRBO', 'ARBOL', 'FLOR']):
        return 'FLORES Y PLANTAS ARTIFICIALES'
    else:
        return 'ACCESORIOS Y OTROS'

def main():
    print("Iniciando importación con registros individuales para los 6 tipos de precio...\n")

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
    except Exception as e:
        print(f"Error conectando a PostgreSQL: {e}")
        return

    print("Limpiando base de datos...")
    try:
        cur.execute('DELETE FROM historial_precios;')
        cur.execute('DELETE FROM stock_actual;')
        cur.execute('DELETE FROM precios_actuales;')
        cur.execute('DELETE FROM cotizacion_detalle;')
        cur.execute('DELETE FROM inventario_movimientos;')
        cur.execute('DELETE FROM alertas_stock;')
        cur.execute('DELETE FROM productos;')
        conn.commit()
        print("Tablas limpiadas exitosamente.\n")
    except Exception as e:
        conn.rollback()

    id_almacen_centro = 1
    try:
        cur.execute("SELECT id_almacen FROM almacenes WHERE UPPER(nombre) LIKE '%CENTRO%' LIMIT 1;")
        res_alm = cur.fetchone()
        if res_alm:
            id_almacen_centro = res_alm[0]
        conn.commit()
    except Exception:
        conn.rollback()

    csv_principal = os.path.join(FOLDER_PATH, "PRODUCTOS-UNIDOS.xlsx.csv")
    productos_map = {}

    if os.path.exists(csv_principal):
        print("--- ETAPA 1: Cargando productos maestros ---")
        try:
            df_csv = pd.read_csv(csv_principal, sep=None, engine='python', encoding='utf-8-sig')
            df_csv.columns = [str(c).replace('\ufeff', '').upper().strip() for c in df_csv.columns]

            col_cod = next((c for c in df_csv.columns if 'COD' in c), df_csv.columns[0])
            col_desc = next((c for c in df_csv.columns if 'DESCRIP' in c), df_csv.columns[1])
            col_tam = next((c for c in df_csv.columns if 'TAMAÑO' in c or 'TAMANO' in c), None)
            col_flor = next((c for c in df_csv.columns if 'FLOR' in c), None)
            col_foll = next((c for c in df_csv.columns if 'FOLL' in c), None)
            col_mat = next((c for c in df_csv.columns if 'MAT' in c), None)
            col_comp = next((c for c in df_csv.columns if 'COMP' in c), None)
            col_pres = next((c for c in df_csv.columns if 'PRES' in c), None)
            col_cab = next((c for c in df_csv.columns if 'CAB' in c), None)

            for _, row in df_csv.iterrows():
                codigo = clean_code(row[col_cod])
                if not codigo or len(codigo) < 2:
                    continue

                codigo_key = codigo.upper().replace(" ", "")
                if codigo_key in productos_map:
                    continue

                descripcion = clean_str(row.get(col_desc), "Sin descripción")
                tamano = clean_str(row.get(col_tam)) if col_tam else None
                tipo_flor = clean_str(row.get(col_flor)) if col_flor else None
                follaje = clean_str(row.get(col_foll)) if col_foll else None
                material = clean_str(row.get(col_mat)) if col_mat else None
                composicion = clean_str(row.get(col_comp)) if col_comp else None
                presentacion = clean_str(row.get(col_pres)) if col_pres else None
                n_cabezas = int(parse_num(row.get(col_cab))) if col_cab and pd.notna(row.get(col_cab)) else None

                cur.execute("SAVEPOINT insert_prod;")
                try:
                    cur.execute(
                        '''
                        INSERT INTO productos (
                            codigo, descripcion, stock_principal, stock_total, activo, 
                            tamano, tipo_flor, follaje, material, composicion, presentacion, numero_cabezas,
                            created_at, updated_at
                        ) VALUES (%s, %s, 0, 0, True, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        RETURNING id_producto;
                        ''',
                        (codigo, descripcion, tamano, tipo_flor, follaje, material, composicion, presentacion, n_cabezas)
                    )
                    id_prod = cur.fetchone()[0]
                    productos_map[codigo_key] = id_prod
                    cur.execute("RELEASE SAVEPOINT insert_prod;")
                    conn.commit()
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT insert_prod;")

            print(f"Productos maestros registrados: {len(productos_map)}\n")
        except Exception as e:
            print(f"Error CSV maestro: {e}")

    print("--- ETAPA 2: Procesando pólizas y generando las 6 escalas de historial ---")
    archivos = sorted(glob.glob(os.path.join(FOLDER_PATH, "*.xls*")))
    total_procesados = 0
    total_historial = 0

    for archivo in archivos:
        nombre_archivo = os.path.basename(archivo)
        if "PRODUCTOS-UNIDOS" in nombre_archivo or nombre_archivo.startswith("~$"):
            continue

        match_anio = re.search(r'\d{4}', nombre_archivo)
        anio = int(match_anio.group(0)) if match_anio else datetime.now().year
        fecha_mov = datetime(anio, 1, 1)

        print(f"Leyendo póliza: {nombre_archivo} (Año {anio})")

        try:
            xl = pd.ExcelFile(archivo)
        except Exception:
            continue

        hojas_poliza = [sheet for sheet in xl.sheet_names if 'POL' in sheet.upper() and 'PACK' not in sheet.upper()]

        for hoja in hojas_poliza:
            df = xl.parse(hoja, header=None)

            col_codigo, col_desc, col_cant = -1, -1, -1
            header_row = -1

            for i in range(min(20, len(df))):
                fila = [str(x).upper().strip() for x in df.iloc[i].values]
                for j, val in enumerate(fila):
                    if val in ['CODIGO', 'CÓDIGO', 'COD'] and col_codigo == -1: col_codigo = j
                    elif 'DESCRIP' in val and col_desc == -1: col_desc = j
                    elif ('CANT' in val or 'UND' in val) and col_cant == -1: col_cant = j

                if col_codigo != -1:
                    header_row = i
                    break

            if header_row == -1:
                continue

            row_hdr = [str(x).upper().strip() for x in df.iloc[header_row].values]
            idx_costos = [i for i, x in enumerate(row_hdr) if 'COSTO' in x]
            idx_mayores = [i for i, x in enumerate(row_hdr) if 'MAYOR' in x]
            idx_docenas = [i for i, x in enumerate(row_hdr) if 'DOCENA' in x]
            idx_unidades = [i for i, x in enumerate(row_hdr) if 'UNIDAD' in x]

            col_costo_dist = idx_costos[0] if len(idx_costos) > 0 else -1
            col_mayor_dist = idx_mayores[0] if len(idx_mayores) > 0 else -1
            col_docena_dist = idx_docenas[0] if len(idx_docenas) > 0 else -1
            col_unidad_dist = idx_unidades[0] if len(idx_unidades) > 0 else -1

            col_costo_norm = idx_costos[1] if len(idx_costos) > 1 else col_costo_dist
            col_mayor_norm = idx_mayores[1] if len(idx_mayores) > 1 else col_mayor_dist
            col_docena_norm = idx_docenas[1] if len(idx_docenas) > 1 else col_docena_dist
            col_unidad_norm = idx_unidades[1] if len(idx_unidades) > 1 else col_unidad_dist

            for r in range(header_row + 1, len(df)):
                fila = df.iloc[r].values
                if len(fila) <= col_codigo:
                    continue

                codigo = clean_code(fila[col_codigo])
                if not codigo:
                    continue

                codigo_key = codigo.upper().replace(" ", "")
                descripcion = clean_str(fila[col_desc]) if col_desc != -1 and col_desc < len(fila) else 'Sin descripción'
                cant = parse_num(fila[col_cant]) if col_cant != -1 and col_cant < len(fila) else 0.0

                costo_dist = parse_num(fila[col_costo_dist]) if col_costo_dist != -1 and col_costo_dist < len(fila) else 0.0
                p_mayor_dist = parse_num(fila[col_mayor_dist]) if col_mayor_dist != -1 and col_mayor_dist < len(fila) else 0.0
                p_docena_dist = parse_num(fila[col_docena_dist]) if col_docena_dist != -1 and col_docena_dist < len(fila) else 0.0
                p_unidad_dist = parse_num(fila[col_unidad_dist]) if col_unidad_dist != -1 and col_unidad_dist < len(fila) else 0.0

                costo_norm = parse_num(fila[col_costo_norm]) if col_costo_norm != -1 and col_costo_norm < len(fila) else costo_dist
                p_mayor_norm = parse_num(fila[col_mayor_norm]) if col_mayor_norm != -1 and col_mayor_norm < len(fila) else p_mayor_dist
                p_docena_norm = parse_num(fila[col_docena_norm]) if col_docena_norm != -1 and col_docena_norm < len(fila) else p_docena_dist
                p_unidad_norm = parse_num(fila[col_unidad_norm]) if col_unidad_norm != -1 and col_unidad_norm < len(fila) else p_unidad_dist

                id_prod = productos_map.get(codigo_key)

                cur.execute("SAVEPOINT proc_poliza;")
                try:
                    if not id_prod:
                        cur.execute(
                            '''
                            INSERT INTO productos (codigo, descripcion, stock_principal, stock_total, activo, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, True, NOW(), NOW())
                            RETURNING id_producto;
                            ''',
                            (codigo, descripcion, cant, cant)
                        )
                        id_prod = cur.fetchone()[0]
                        productos_map[codigo_key] = id_prod
                    else:
                        if cant > 0:
                            cur.execute(
                                'UPDATE productos SET stock_principal = %s, stock_total = %s, updated_at = NOW() WHERE id_producto = %s;',
                                (cant, cant, id_prod)
                            )

                    if cant > 0:
                        try:
                            cur.execute(
                                '''
                                INSERT INTO stock_actual (id_producto, id_almacen, cantidad, updated_at)
                                VALUES (%s, %s, %s, NOW())
                                ON CONFLICT (id_producto, id_almacen) DO UPDATE SET
                                    cantidad = EXCLUDED.cantidad,
                                    updated_at = NOW();
                                ''',
                                (id_prod, id_almacen_centro, cant)
                            )
                        except Exception:
                            pass

                    # Definición de las 6 escalas de precios
                    escalas = [
                        ('UNIDA TIENDA', 'precio_unidad_normal', p_unidad_norm, costo_norm),
                        ('DOCENA TIENDA', 'precio_docena_normal', p_docena_norm, costo_norm),
                        ('MAYOR TIENDA', 'precio_mayor_normal', p_mayor_norm, costo_norm),
                        ('UNIDA DISTRIBUIDOR', 'precio_unidad_dist', p_unidad_dist, costo_dist),
                        ('DOCENA DISTRIBUIDOR', 'precio_docena_dist', p_docena_dist, costo_dist),
                        ('MAYOR DISTRIBUIDOR', 'precio_mayor_dist', p_mayor_dist, costo_dist),
                    ]

                    # Obtener precios anteriores existentes
                    cur.execute(
                        '''
                        SELECT precio_unidad_normal, precio_docena_normal, precio_mayor_normal,
                               precio_unidad_dist, precio_docena_dist, precio_mayor_dist
                        FROM precios_actuales WHERE id_producto = %s;
                        ''', 
                        (id_prod,)
                    )
                    prev_row = cur.fetchone()
                    prev_dict = {}
                    if prev_row:
                        prev_dict = {
                            'precio_unidad_normal': float(prev_row[0] or 0),
                            'precio_docena_normal': float(prev_row[1] or 0),
                            'precio_mayor_normal': float(prev_row[2] or 0),
                            'precio_unidad_dist': float(prev_row[3] or 0),
                            'precio_docena_dist': float(prev_row[4] or 0),
                            'precio_mayor_dist': float(prev_row[5] or 0)
                        }

                    # Registrar evento de historial para las 6 escalas si hay un precio válido
                    for etiqueta, col_db, p_nuevo, c_unit in escalas:
                        if p_nuevo > 0:
                            v_ant = prev_dict.get(col_db, 0.0)
                            if abs(v_ant - p_nuevo) > 0.001 or v_ant == 0.00:
                                cur.execute(
                                    '''
                                    INSERT INTO historial_precios (
                                        id_producto, campo_modificado, valor_anterior, valor_nuevo, 
                                        fecha_cambio, actor_nombre, evento, motivo
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                                    ''',
                                    (
                                        id_prod, 
                                        col_db, 
                                        v_ant, 
                                        p_nuevo, 
                                        fecha_mov, 
                                        'ADMIN', 
                                        'IMPORTACION', 
                                        f'{etiqueta} | Costo: {c_unit:.2f} | Póliza {anio}'
                                    )
                                )
                                total_historial += 1

                    # Upsert en precios_actuales
                    cur.execute(
                        '''
                        INSERT INTO precios_actuales (
                            id_producto, costo_normal, precio_unidad_normal, precio_docena_normal, precio_mayor_normal,
                            costo_distribuidor, precio_unidad_dist, precio_docena_dist, precio_mayor_dist, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (id_producto) DO UPDATE SET
                            costo_normal = EXCLUDED.costo_normal,
                            precio_unidad_normal = EXCLUDED.precio_unidad_normal,
                            precio_docena_normal = EXCLUDED.precio_docena_normal,
                            precio_mayor_normal = EXCLUDED.precio_mayor_normal,
                            costo_distribuidor = EXCLUDED.costo_distribuidor,
                            precio_unidad_dist = EXCLUDED.precio_unidad_dist,
                            precio_docena_dist = EXCLUDED.precio_docena_dist,
                            precio_mayor_dist = EXCLUDED.precio_mayor_dist,
                            updated_at = NOW();
                        ''',
                        (
                            id_prod, costo_norm, p_unidad_norm, p_docena_norm, p_mayor_norm,
                            costo_dist, p_unidad_dist, p_docena_dist, p_mayor_dist
                        )
                    )

                    total_procesados += 1
                    cur.execute("RELEASE SAVEPOINT proc_poliza;")
                    conn.commit()
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT proc_poliza;")

    print("\n--- ETAPA 3: Purga a máximo 18 registros por producto (3 eventos x 6 tipos) ---")
    try:
        cur.execute(
            '''
            DELETE FROM historial_precios
            WHERE id_historial NOT IN (
                SELECT id_historial
                FROM (
                    SELECT id_historial,
                           ROW_NUMBER() OVER (PARTITION BY id_producto ORDER BY fecha_cambio DESC, id_historial DESC) as rn
                    FROM historial_precios
                ) t
                WHERE t.rn <= 18
            );
            '''
        )
        conn.commit()
        print("Purga completada exitosamente.")
    except Exception as e:
        conn.rollback()

    cur.close()
    conn.close()

    print("\n=======================================================")
    print("¡Importación finalizada con éxito!")
    print(f"- Productos en catálogo: {len(productos_map)}")
    print(f"- Registros de pólizas procesados: {total_procesados}")
    print(f"- Entradas en Historial creadas: {total_historial}")
    print("=======================================================")

if __name__ == '__main__':
    main()