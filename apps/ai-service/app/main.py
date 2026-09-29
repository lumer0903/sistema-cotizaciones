import os
import math
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(
    title="Gold Continent AI Service",
    version="0.1.0"
)

# Configuración de base de datos PostgreSQL desde la cadena DATABASE_URL de tu .env
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:root@localhost:5432/postgres")

# Variables globales para Cache de IA
PRODUCTS_CACHE: List[Dict[str, Any]] = []
VECTORIZER: Optional[TfidfVectorizer] = None
TFIDF_MATRIX = None

# Modelos de entrada y salida (Pydantic)
class RecommendRequest(BaseModel):
    id_producto: int
    id_cliente: Optional[int] = None
    id_almacen: Optional[int] = None
    tipo_precio: Optional[str] = "precio_unidad_normal"

class ProductRecommendation(BaseModel):
    id: int
    codigo: str
    descripcion: str
    precio: float
    stock: float
    similarityScore: float
    categoria: str
    margen: float

class RecommendResponse(BaseModel):
    similar: List[ProductRecommendation]
    upsell: List[ProductRecommendation]
    equilibrio: List[ProductRecommendation]


def get_db_connection():
    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )


def obtener_precio_y_costo(prod: Dict[str, Any], tipo_precio: str):
    """
    Soporta los 6 esquemas de precios y 2 costos de la BD.
    """
    precios_validos = [
        'precio_unidad_normal', 'precio_docena_normal', 'precio_mayor_normal',
        'precio_unidad_dist', 'precio_docena_dist', 'precio_mayor_dist'
    ]
    
    col_precio = tipo_precio if tipo_precio in precios_validos else 'precio_unidad_normal'
    col_costo = 'costo_distribuidor' if '_dist' in col_precio else 'costo_normal'
    
    precio = float(prod.get(col_precio) or 0)
    costo = float(prod.get(col_costo) or 0)
    
    return precio, costo


def calcular_margen(precio: float, costo: float) -> float:
    if costo <= 0:
        return 0.0
    return round(((precio - costo) / costo) * 100, 2)


def load_products_and_train_tfidf():
    global PRODUCTS_CACHE, VECTORIZER, TFIDF_MATRIX
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Consulta SQL con las 8 columnas exactas de precios_actuales
        query = """
            SELECT 
                p.id_producto,
                p.codigo,
                p.descripcion,
                COALESCE(p.stock_total, 100) as stock_total,
                COALESCE(c.nombre_categoria, 'GENERAL') as nombre_categoria,
                COALESCE(pa.costo_normal, 0) as costo_normal,
                COALESCE(pa.precio_unidad_normal, 0) as precio_unidad_normal,
                COALESCE(pa.precio_docena_normal, 0) as precio_docena_normal,
                COALESCE(pa.precio_mayor_normal, 0) as precio_mayor_normal,
                COALESCE(pa.costo_distribuidor, 0) as costo_distribuidor,
                COALESCE(pa.precio_unidad_dist, 0) as precio_unidad_dist,
                COALESCE(pa.precio_docena_dist, 0) as precio_docena_dist,
                COALESCE(pa.precio_mayor_dist, 0) as precio_mayor_dist
            FROM productos p
            LEFT JOIN precios_actuales pa ON p.id_producto = pa.id_producto
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.activo = true;
        """
        cursor.execute(query)
        PRODUCTS_CACHE = cursor.fetchall()
        cursor.close()
        conn.close()

        if not PRODUCTS_CACHE:
            print("⚠️ Advertencia: No se encontraron productos en la Base de Datos.")
            return

        # Vectorización TF-IDF basada en la descripción y categoría del producto
        corpus = [
            f"{p['descripcion']} {p['nombre_categoria']}"
            for p in PRODUCTS_CACHE
        ]
        
        VECTORIZER = TfidfVectorizer(stop_words='english')
        TFIDF_MATRIX = VECTORIZER.fit_transform(corpus)
        print(f"✅ Matriz TF-IDF cargada: {len(PRODUCTS_CACHE)} productos procesados.")

    except Exception as e:
        print(f"❌ Error al cargar datos e inicializar TF-IDF: {e}")


@app.on_event("startup")
def startup_event():
    print("Pool PostgreSQL conectado.")
    load_products_and_train_tfidf()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "goldcontinent-ai"}


@app.post("/admin/refresh-cache")
def refresh_cache():
    load_products_and_train_tfidf()
    return {"status": "success", "total_productos": len(PRODUCTS_CACHE)}


@app.post("/suggest", response_model=RecommendResponse)
def suggest(req: RecommendRequest):
    if not PRODUCTS_CACHE or TFIDF_MATRIX is None:
        raise HTTPException(status_code=500, detail="El modelo TF-IDF no está inicializado")

    # 1. Buscar producto base por id_producto
    target_idx = next((i for i, p in enumerate(PRODUCTS_CACHE) if p['id_producto'] == req.id_producto), None)
    
    if target_idx is None:
        return {"similar": [], "upsell": [], "equilibrio": []}

    target_prod = PRODUCTS_CACHE[target_idx]
    target_precio, target_costo = obtener_precio_y_costo(target_prod, req.tipo_precio)

    # 2. Calcular similitud del coseno entre el producto base y los demás
    cosine_sim = cosine_similarity(TFIDF_MATRIX[target_idx], TFIDF_MATRIX).flatten()

    candidates = []
    for idx, prod in enumerate(PRODUCTS_CACHE):
        if idx == target_idx:
            continue  # Excluir el mismo producto

        precio, costo = obtener_precio_y_costo(prod, req.tipo_precio)
        score = float(cosine_sim[idx])
        margen = calcular_margen(precio, costo)
        stock = float(prod.get('stock_total', 0))

        candidates.append({
            "id": prod['id_producto'],
            "codigo": prod['codigo'],
            "descripcion": prod['descripcion'],
            "precio": precio,
            "stock": stock,
            "similarityScore": round(score, 4),
            "categoria": prod['nombre_categoria'],
            "margen": margen
        })

    # 3. Categorizar recomendaciones

    # SIMILAR: Mayor similitud por TF-IDF
    similar = sorted(candidates, key=lambda x: x['similarityScore'], reverse=True)[:5]

    # UPSELL: Similitud relevante + Precio mayor al producto base (>= +5%) + Buen margen
    upsell_candidates = [
        c for c in candidates 
        if c['precio'] >= (target_precio * 1.05) and c['similarityScore'] > 0.05
    ]
    upsell = sorted(upsell_candidates, key=lambda x: (x['margen'], x['precio']), reverse=True)[:5]

    # EQUILIBRIO: Ponderación de Similitud (50%), Margen (35%) y Stock (15%)
    def calcular_score_equilibrio(item):
        norm_sim = item['similarityScore']
        norm_margen = min(item['margen'] / 100.0, 1.0)
        norm_stock = 1.0 if item['stock'] > 0 else 0.0
        return (norm_sim * 0.50) + (norm_margen * 0.35) + (norm_stock * 0.15)

    equilibrio = sorted(candidates, key=calcular_score_equilibrio, reverse=True)[:5]

    return {
        "similar": similar,
        "upsell": upsell,
        "equilibrio": equilibrio
    }