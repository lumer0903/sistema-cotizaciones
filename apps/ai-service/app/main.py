import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://goldcontinent:goldcontinent_dev@localhost:5432/goldcontinent")

STOP_WORDS_SPANISH = [
    'el', 'la', 'los', 'les', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'y', 'o', 'en', 'con', 'para', 'por',
    'su', 'sus', 'a', 'ante', 'bajo', 'cabe', 'contra', 'desde', 'durante', 'entre', 'hacia', 'hasta', 'mediante',
    'segun', 'sin', 'sobre', 'tras', 'versus', 'via', 'que', 'este', 'esta', 'estos', 'estas', 'mi', 'mis', 'tu', 'tus',
    'yo', 'me', 'nos', 'se', 'ellos', 'ellas', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'cual', 'cuales'
]

db_pool: psycopg2.pool.ThreadedConnectionPool | None = None
tfidf_matrix = None
product_ids = None
descriptions = None
vectorizer = None
products_data = None

class RecommendRequest(BaseModel):
    id_producto: int
    id_cliente: Optional[int] = None
    id_almacen: Optional[int] = None

class ProductRecommendation(BaseModel):
    id: int
    codigo: str
    descripcion: str
    precio: float
    stock: int
    similarityScore: float
    categoria: Optional[str] = None
    margen: Optional[float] = None

class RecommendResponse(BaseModel):
    similar: list[ProductRecommendation]
    upsell: list[ProductRecommendation]
    equilibrio: list[ProductRecommendation]

def load_products():
    global product_ids, descriptions, vectorizer, tfidf_matrix, products_data
    
    conn = db_pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
            SELECT 
                p.id_producto, 
                p.codigo, 
                p.descripcion, 
                p.stock_total,
                p.id_categoria,
                c.nombre_categoria,
                COALESCE(pa.precio_unidad_normal, 0) as precio_normal,
                COALESCE(pa.precio_unidad_dist, 0) as precio_distribuidor,
                COALESCE(pa.costo_normal, 0) as costo_normal,
                COALESCE(pa.costo_distribuidor, 0) as costo_distribuidor
            FROM productos p 
            LEFT JOIN precios_actuales pa ON p.id_producto = pa.id_producto
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.activo = true
            """
            cur.execute(query)
            rows = cur.fetchall()
            products_data = {r['id_producto']: r for r in rows}
            product_ids = [r['id_producto'] for r in rows]
            descriptions = [r['descripcion'] or "" for r in rows]
    finally:
        db_pool.putconn(conn)
    
    if descriptions and any(d.strip() for d in descriptions):
        vectorizer = TfidfVectorizer(stop_words=STOP_WORDS_SPANISH, ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(descriptions)
        print(f"TF-IDF matrix computed: {tfidf_matrix.shape[0]} products, {tfidf_matrix.shape[1]} features")
    else:
        print("No products with descriptions found")

def calculate_margin(product: dict, tipo_precio: str) -> float:
    """Calcula margen porcentual basado en tipo de precio"""
    if tipo_precio == 'distribuidor':
        precio = float(product.get('precio_distribuidor', 0) or 0)
        costo = float(product.get('costo_distribuidor', 0) or 0)
    else:
        precio = float(product.get('precio_normal', 0) or 0)
        costo = float(product.get('costo_normal', 0) or 0)
    
    if costo <= 0:
        return 0.0
    return ((precio - costo) / costo) * 100

def get_stock_by_almacen(product_id: int, id_almacen: int) -> int:
    """Obtiene stock específico de un almacén"""
    conn = db_pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT cantidad FROM stock_actual WHERE id_producto = %s AND id_almacen = %s"
            cur.execute(query, (product_id, id_almacen))
            row = cur.fetchone()
            return row['cantidad'] if row else 0
    finally:
        db_pool.putconn(conn)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    
    db_pool = psycopg2.pool.ThreadedConnectionPool(1, 10, DATABASE_URL)
    print("Database connection pool initialized")
    
    load_products()
    
    yield
    
    db_pool.closeall()
    print("Database connection pool closed")

app = FastAPI(title="Gold Continent AI Service", lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "goldcontinent-ai"}

@app.post("/suggest", response_model=RecommendResponse)
async def suggest(req: RecommendRequest):
    if tfidf_matrix is None or req.id_producto not in product_ids:
        return {"similar": [], "upsell": [], "equilibrio": []}
    
    # Determinar tipo de precio del cliente
    tipo_precio = 'normal'
    if req.id_cliente:
        conn = db_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT tipo FROM clientes WHERE id_cliente = %s", (req.id_cliente,))
                row = cur.fetchone()
                if row:
                    tipo_precio = row['tipo']
        finally:
            db_pool.putconn(conn)
    
    idx = product_ids.index(req.id_producto)
    sims = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    
    # Obtener candidatos ordenados por similitud (excluyendo el producto base)
    candidates = [
        (i, s) for i, s in zip(product_ids, sims) if i != req.id_producto
    ]
    candidates.sort(key=lambda x: -x[1])
    
    # Enriquecer candidatos con datos de negocio
    enriched = []
    for pid, sim_score in candidates:
        prod = products_data[pid]
        
        # Stock: usar almacén específico si se proporciona, sino total
        stock = prod['stock_total']
        if req.id_almacen:
            stock = get_stock_by_almacen(pid, req.id_almacen)
        
        # Precio según tipo de cliente
        precio = float(prod.get('precio_distribuidor', 0) or 0) if tipo_precio == 'distribuidor' else float(prod.get('precio_normal', 0) or 0)
        
        # Margen
        margen = calculate_margin(prod, tipo_precio)
        
        enriched.append({
            'id': pid,
            'codigo': prod['codigo'],
            'descripcion': prod['descripcion'],
            'precio': precio,
            'stock': stock,
            'similarityScore': round(float(sim_score), 4),
            'categoria': prod.get('nombre_categoria'),
            'margen': round(margen, 2),
        })
    
    # Filtrar solo productos con stock > 0
    enriched = [p for p in enriched if p['stock'] > 0]
    
    # 1. MÁS SIMILAR: Top 2 por similitud (misma categoría si posible)
    base_categoria = products_data[req.id_producto].get('id_categoria')
    same_category = [p for p in enriched if p.get('categoria') and products_data[p['id']].get('id_categoria') == base_categoria]
    other_category = [p for p in enriched if not p.get('categoria') or products_data[p['id']].get('id_categoria') != base_categoria]
    
    similar = (same_category + other_category)[:2]
    
    # 2. UPSELL (Mejor Opción): Mayor margen, precio mayor al base
    base_precio = float(products_data[req.id_producto].get('precio_distribuidor', 0) or 0) if tipo_precio == 'distribuidor' else float(products_data[req.id_producto].get('precio_normal', 0) or 0)
    upsell_candidates = [p for p in enriched if p['precio'] > base_precio * 1.1]  # Al menos 10% más caro
    upsell = sorted(upsell_candidates, key=lambda x: -x['margen'])[:2]
    
    # 3. EQUILIBRIO (Best Value): Mejor ratio precio/stock, buen margen, stock garantizado
    equilibrio_candidates = [p for p in enriched if p['stock'] >= 10]  # Stock mínimo garantizado
    for p in equilibrio_candidates:
        p['value_score'] = p['margen'] * 0.5 + (p['stock'] / 100) * 0.3 + (1 - p['similarityScore']) * 0.2
    equilibrio = sorted(equilibrio_candidates, key=lambda x: -x['value_score'])[:2]
    
    # Limpiar value_score antes de retornar
    for p in equilibrio:
        p.pop('value_score', None)
    
    return {
        "similar": similar,
        "upsell": upsell,
        "equilibrio": equilibrio,
    }

@app.post("/admin/refresh-cache")
async def refresh_cache():
    load_products()
    return {"status": "ok", "products_loaded": len(product_ids) if product_ids else 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)