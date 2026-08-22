import os
import json
import time
import pandas as pd
from google import genai
from google.genai import types

# 1. Configuración de API Key
os.environ["GEMINI_API_KEY"] = "AQ.Ab8RN6KyCgeJtaT52DknC8xrCVrcKG1z_9HOiu_HQdTtb51ysw"
client = genai.Client()

ruta_directorio_actual = os.path.dirname(os.path.abspath(__file__))
print(f"📍 Ruta real detectada por el script: {ruta_directorio_actual}")

archivo_csv_actual = os.path.join(ruta_directorio_actual, "poliza_2025.csv")
archivo_csv_salida = os.path.join(ruta_directorio_actual, "poliza_2025_procesado.csv")

if not os.path.exists(archivo_csv_actual):
    raise FileNotFoundError(f"No se encontró el archivo '{archivo_csv_actual}'.")

# 2. Leer el CSV original
try:
    df = pd.read_csv(archivo_csv_actual, encoding='utf-8-sig')
except Exception:
    try:
        df = pd.read_csv(archivo_csv_actual, encoding='latin-1')
    except Exception:
        df = pd.read_csv(archivo_csv_actual, sep=None, engine='python', encoding='utf-8-sig')

df.columns = df.columns.str.strip().str.replace('\ufeff', '')

if 'CODIGO' not in df.columns or 'DESCRIPCION' not in df.columns:
    raise ValueError(f"Columnas requeridas no encontradas. Las columnas detectadas son: {list(df.columns)}")

# Quedarnos solo con las columnas deseadas
columnas_a_mantener = ['CODIGO', 'DESCRIPCION']
df = df[columnas_a_mantener]

# Si ya existía un progreso anterior, lo respetamos; si no, creamos la columna vacía
if 'Atributos_JSON' not in df.columns:
    df['Atributos_JSON'] = None

archivos_en_carpeta = os.listdir(ruta_directorio_actual)

print(f"✅ Archivo '{os.path.basename(archivo_csv_actual)}' cargado con éxito ({len(df)} productos).")
print("🚀 Iniciando procesamiento masivo BLINDADO fila por fila...\n")

# 3. Iterar y procesar uno por uno
for index, fila in df.iterrows():
    codigo = str(fila['CODIGO']).strip()
    descripcion_actual = str(fila['DESCRIPCION']).strip()
    
    # Si ya se procesó en un intento previo (por si vuelves a correr el script), lo salta
    if pd.notna(df.at[index, 'Atributos_JSON']) and df.at[index, 'Atributos_JSON'] != "":
        continue
        
    nombre_archivo_encontrado = None
    for archivo in archivos_en_carpeta:
        if archivo in [os.path.basename(archivo_csv_actual), "procesar.py", os.path.basename(archivo_csv_salida)]:
            continue
            
        nombre_limpio = archivo
        while True:
            base, ext = os.path.splitext(nombre_limpio)
            if ext.lower() in ['.jpg', '.jpeg', '.png', '.webp', '.bmp']:
                nombre_limpio = base
            else:
                break
        
        if nombre_limpio.strip().lower() == codigo.lower():
            nombre_archivo_encontrado = archivo
            break
            
    if not nombre_archivo_encontrado:
        continue
        
    ruta_imagen = os.path.join(ruta_directorio_actual, nombre_archivo_encontrado)
    print(f"📸 Procesando código: {codigo} ... ", end="", flush=True)
    
    # Bucle de reintento estricto para el error 429 de cuota agotada
    completado = False
    while not completado:
        try:
            with open(ruta_imagen, "rb") as f:
                datos_imagen = f.read()
                
            mime_type = "image/png" if nombre_archivo_encontrado.lower().endswith('.png') else "image/jpeg"

            prompt_completo = f"""
Actúa como un experto en análisis de datos visuales y gestión de inventario para un e-commerce. Tu tarea es extraer los atributos técnicos EXCLUSIVAMENTE de la 'IMAGEN ADJUNTA' basándote en las siguientes reglas de negocio.

CONTEXTO DEL PRODUCTO: {descripcion_actual}

REGLAS PARA EL FORMATO:
- "Unidad": Un solo tallo con una sola flor (puede incluir las hojas verdes propias de la flor pegadas a su tallo).
- "Ramo solo": Un paquete, bouquet o manojo de flores del mismo tipo, donde cada tallo conserva únicamente sus hojas de fábrica de origen. No hay plantas de relleno.
- "Ramo completo": Un arreglo que incluye la flor principal MÁS follaje, ramas de relleno o plantas secundarias de otra especie (ej. eucalipto, helechos, gipsófila, etc.).

Devuelve la información EXCLUSIVAMENTE en formato JSON, sin bloques de texto explicativo, respetando exactamente la siguiente estructura:

{{
  "analisis_inventario": {{
    "prefijo_importadora": "[Prefijo]",
    "numero_cabezas_contadas": [Número entero de capullos/flores visibles],
    "letra_distintiva_flor": "[Letra inicial de la flor]",
    "variante_color": "[Nombre corto del color]"
  }},
  "formato": "[Unidad OR Ramo solo OR Ramo completo]",
  "flor_principal": "[Nombre común de la flor en español]",
  "color_principal": "[Color predominante]",
  "hojas_propias": [true o false],
  "follaje_extra_relleno": [true o false]
}}
"""

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(data=datos_imagen, mime_type=mime_type),
                    prompt_completo
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            # Guardamos el resultado en la memoria del DataFrame
            df.at[index, 'Atributos_JSON'] = response.text.strip()
            print("💾 ¡Logrado y Guardado!")
            
            # GUARDADO CRÍTICO EN DISCO: Reescribe el CSV con el nuevo cambio al instante
            df.to_csv(archivo_csv_salida, index=False, encoding='utf-8')
            
            completado = True
            time.sleep(4)  # Pausa prudencial antipánico para la versión free
            
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"\n⏳ Cuota saturada. Pausa forzada de 32 segundos para liberar la API... ", end="", flush=True)
                time.sleep(32)
                print("Reintentando el mismo producto...")
            else:
                print(f"❌ Error crítico: {e}")
                df.at[index, 'Atributos_JSON'] = json.dumps({"error": str(e)})
                df.to_csv(archivo_csv_salida, index=False, encoding='utf-8')
                completado = True

print(f"\n¡Felicidades! Todo el proceso ha concluido de forma exitosa.")
print(f"Tu archivo final ultra-limpio te espera en: '{archivo_csv_salida}'")