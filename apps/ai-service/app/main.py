import os
import re
import unicodedata
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# 1. Cargar el .env de la raíz del monorepo (sube 3 niveles desde app/main.py)
ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# 2. Leer DATABASE_URL y limpiar parámetros como '?schema=public' que psycopg2 no soporta
raw_db_url = os.getenv("DATABASE_URL", "postgresql://postgres:root@localhost:5432/postgres")
DATABASE_URL = raw_db_url.split("?")[0]

STOP_WORDS_SPANISH = [
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'y', 'o', 'en', 'con', 'para', 'por',
    'su', 'sus', 'a', 'ante', 'bajo', 'cabe', 'contra', 'desde', 'durante', 'entre', 'hacia', 'hasta', 'mediante',
    'segun', 'sin', 'sobre', 'tras', 'versus', 'via', 'que', 'este', 'esta', 'estos', 'estas', 'mi', 'mis', 'tu', 'tus',
    'yo', 'me', 'nos', 'se', 'ellos', 'ellas', 'nosotros', 'nosotras', 'cual', 'cuales', 'cm', 'm', 'mts', 'x', 'color'
]

db_pool: psycopg2.pool.ThreadedConnectionPool | None = None
tfidf_matrix = None
product_ids = None
vectorizer = None
products_data = None

# Schemas de Pydantic
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

# Funciones de Preprocesamiento y Vectorización
def normalizar_texto(texto: str) -> str:
    if not texto:
        return ""
    texto = unicodedata.normalize('NFD', texto).encode('ascii', 'ignore').decode("utf-8")
    texto = texto.lower()
    texto = re.sub(r'[^a-z0-9\s]', ' ', texto)
    return re.sub(r'\s+', ' ', texto).strip()

def enriquecer_descripcion(desc: str) -> str:
    clean_desc = normalizar_texto(desc)
    keywords = ['rosa', 'rosita', 'girasol', 'crisantemo', 'orquidea', 'peonia', 'ramo', 'vara', 'guia', 'maceta', 'follaje', 'panel']
    enriquecidas = [w for w in clean_desc.split() if w in keywords]
    return f"{clean_desc} {' '.join(enriquecidas)}"

def load_products():
    global product_ids, vectorizer, tfidf_matrix, products_data
    if not db_pool:
        return
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
            corpus = [enriquecer_descripcion(r['descripcion']) for r in rows]
    finally:
        db_pool.putconn(conn)
    
    if corpus and any(d.strip() for d in corpus):
        vectorizer = TfidfVectorizer(
            stop_words=STOP_WORDS_SPANISH,
            ngram_range=(1, 2),
            sublinear_tf=True,
            norm='l2'
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        print(f"✅ Matriz TF-IDF cargada: {tfidf_matrix.shape[0]} productos x {tfidf_matrix.shape[1]} términos.")

def calculate_margin(product: dict, tipo_precio: str) -> float:
    if tipo_precio == 'distribuidor':
        precio = float(product.get('precio_distribuidor', 0) or 0)
        costo = float(product.get('costo_distribuidor', 0) or 0)
    else:
        precio = float(product.get('precio_normal', 0) or 0)
        costo = float(product.get('costo_normal', 0) or 0)
    
    if costo <= 0:
        return 0.0
    return ((precio - costo) / costo) * 100

def get_stock_by_almacen_batch(pids: list[int], id_almacen: int) -> dict[int, int]:
    if not pids or not db_pool:
        return {}
    conn = db_pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT id_producto, cantidad FROM stock_actual WHERE id_almacen = %s AND id_producto = ANY(%s)"
            cur.execute(query, (id_almacen, pids))
            rows = cur.fetchall()
            return {r['id_producto']: r['cantidad'] for r in rows}
    finally:
        db_pool.putconn(conn)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = psycopg2.pool.ThreadedConnectionPool(1, 10, DATABASE_URL)
    print("Pool PostgreSQL conectado.")
    load_products()
    yield
    if db_pool:
        db_pool.closeall()
        print("Pool PostgreSQL cerrado.")

app = FastAPI(title="Gold Continent AI Service", lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "goldcontinent-ai"}

@app.post("/suggest", response_model=RecommendResponse)
async def suggest(req: RecommendRequest):
    if tfidf_matrix is None or req.id_producto not in product_ids:
        return {"similar": [], "upsell": [], "equilibrio": []}
    
    tipo_precio = 'normal'
    if req.id_cliente and db_pool:
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
    sim_scores = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    
    top_indices = np.argsort(-sim_scores)
    top_candidates = []
    for i in top_indices:
        pid = product_ids[i]
        if pid != req.id_producto:
            top_candidates.append((pid, float(sim_scores[i])))
        if len(top_candidates) >= 50:
            break
            
    stock_map = {}
    if req.id_almacen:
        candidate_pids = [pid for pid, _ in top_candidates]
        stock_map = get_stock_by_almacen_batch(candidate_pids, req.id_almacen)

    enriched = []
    for pid, sim_score in top_candidates:
        prod = products_data[pid]
        stock = stock_map.get(pid, prod['stock_total']) if req.id_almacen else prod['stock_total']
        
        if stock <= 0:
            continue
            
        precio = float(prod.get('precio_distribuidor', 0) or 0) if tipo_precio == 'distribuidor' else float(prod.get('precio_normal', 0) or 0)
        margen = calculate_margin(prod, tipo_precio)
        
        enriched.append({
            'id': pid,
            'codigo': prod['codigo'],
            'descripcion': prod['descripcion'],
            'precio': precio,
            'stock': stock,
            'similarityScore': round(sim_score, 4),
            'categoria': prod.get('nombre_categoria'),
            'margen': round(margen, 2),
        })

    base_prod = products_data[req.id_producto]
    base_categoria = base_prod.get('id_categoria')
    base_precio = float(base_prod.get('precio_distribuidor', 0) or 0) if tipo_precio == 'distribuidor' else float(base_prod.get('precio_normal', 0) or 0)

    same_cat = [p for p in enriched if products_data[p['id']].get('id_categoria') == base_categoria]
    diff_cat = [p for p in enriched if products_data[p['id']].get('id_categoria') != base_categoria]
    similar = (same_cat + diff_cat)[:2]

    upsell_candidates = [p for p in enriched if p['precio'] >= base_precio * 1.10]
    upsell = sorted(upsell_candidates, key=lambda x: (-x['margen'], -x['similarityScore']))[:2]

    equilibrio_candidates = [p for p in enriched if p['stock'] >= 5]
    for p in equilibrio_candidates:
        p['value_score'] = (p['similarityScore'] * 0.5) + ((p['margen'] / 100) * 0.3) + (min(p['stock'], 100) / 100 * 0.2)
        
    equilibrio = sorted(equilibrio_candidates, key=lambda x: -x['value_score'])[:2]
    
    for p in equilibrio:
        p.pop('value_score', None)

    return {
        "similar": similar,
        "upsell": upsell,
        "equilibrio": equilibrio
    }

@app.post("/admin/refresh-cache")
async def refresh_cache():
    load_products()
    return {"status": "ok", "products_loaded": len(product_ids) if product_ids else 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)