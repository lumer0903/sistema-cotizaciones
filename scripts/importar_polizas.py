import os
import glob
import re
import pandas as pd
from datetime import datetime
import psycopg2

# Configuración de conexión a la Base de Datos PostgreSQL
# Reemplaza con tus credenciales locales
DB_CONFIG = {
    "dbname": "nombre_de_tu_bd",
    "user": "postgres",
    "password": "tu_password",
    "host": "localhost",
    "port": "5432"
}

FOLDER_PATH = os.path.join(os.getcwd(), 'archivos_excel')

def main():
    print("Iniciando importacion historica con Python...\n")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 1. Limpiar base de datos antes de recargar
    print("Limpiando base de datos...")
    cur.execute('DELETE FROM "HistorialPrecios";')
    cur.execute('DELETE FROM "StockActual";')
    cur.execute('DELETE FROM "PreciosActuales";')
    cur.execute('DELETE FROM "Producto";')
    conn.commit()

    archivos = sorted(glob.glob(os.path.join(FOLDER_PATH, "*.xls*")))
    if not archivos:
        print("No se encontraron archivos Excel.")
        return

    total_procesados = 0

    for archivo in archivos:
        nombre_archivo = os.path.basename(archivo)
        print(f"Leyendo: {nombre_archivo}")

        # Extraer año del nombre
        match_anio = re.search(r'\d{4}', nombre_archivo)
        anio = int(match_anio.group(0)) if match_anio else datetime.now().year
        fecha_mov = datetime(anio, 1, 1)

        xl = pd.ExcelFile(archivo)
        hojas_poliza = [sheet for sheet in xl.sheet_names if 'POLIZA' in sheet.upper()]

        for hoja in hojas_poliza:
            df = xl.parse(hoja, header=None)

            col_codigo, col_desc, col_cant, col_costo = -1, -1, -1, -1
            header_row = -1

            # Buscar la fila de cabeceras
            for i in range(min(20, len(df))):
                fila = [str(x).upper().strip() for x in df.iloc[i].values]
                for j, val in enumerate(fila):
                    if val in ['CODIGO', 'CÓDIGO', 'COD']: col_codigo = j
                    if 'DESCRIP' in val: col_desc = j
                    if 'CANT' in val: col_cant = j
                    if 'COSTO' in val: col_costo = j

                if col_codigo != -1 and col_desc != -1:
                    header_row = i
                    break

            if header_row == -1:
                continue

            for r in range(header_row + 1, len(df)):
                fila = df.iloc[r].values
                codigo = str(fila[col_codigo]).strip() if pd.notna(fila[col_codigo]) else ''

                if not codigo or len(codigo) < 2 or 'TOTAL' in codigo.upper():
                    continue

                descripcion = str(fila[col_desc]).strip() if pd.notna(fila[col_desc]) else 'Sin descripcion'
                cant = float(fila[col_cant]) if col_cant != -1 and pd.notna(fila[col_cant]) else 0.0
                costo = float(fila[col_costo]) if col_costo != -1 and pd.notna(fila[col_costo]) else 0.0

                # Insertar o actualizar producto en PostgreSQL
                cur.execute('SELECT id_producto FROM "Producto" WHERE codigo = %s;', (codigo,))
                prod = cur.fetchone()

                if not prod:
                    cur.execute(
                        'INSERT INTO "Producto" (codigo, descripcion, stock_principal, stock_total, activo) VALUES (%s, %s, %s, %s, %s) RETURNING id_producto;',
                        (codigo, descripcion, cant, cant, True)
                    )
                    id_prod = cur.fetchone()[0]
                else:
                    id_prod = prod[0]
                    cur.execute(
                        'UPDATE "Producto" SET stock_principal = stock_principal + %s, stock_total = stock_total + %s WHERE id_producto = %s;',
                        (cant, cant, id_prod)
                    )

                # Registrar historial
                cur.execute(
                    'INSERT INTO "HistorialPrecios" (id_producto, costo_normal, fecha_cambio) VALUES (%s, %s, %s);',
                    (id_prod, costo, fecha_mov)
                )
                total_procesados += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"\n¡Importacion finalizada con exito! Registros procesados: {total_procesados}")

if __name__ == '__main__':
    main()