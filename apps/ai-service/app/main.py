from decimal import Decimal, ROUND_HALF_UP
import logging
import os
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from pathlib import Path
from dotenv import load_dotenv
from contextlib import closing
from dataclasses import dataclass
from threading import Lock
from typing import Any, Literal, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="Gold Continent AI Service", version="0.2.0")
logger = logging.getLogger(__name__)
# El entorno del proceso prevalece; desarrollo local carga la misma BD del monorepo.
ROOT = next((parent for parent in Path(__file__).resolve().parents if (parent / 'packages' / 'database').is_dir()), Path(__file__).resolve().parents[1])
load_dotenv(ROOT / "apps" / "ai-service" / ".env")
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "packages" / "database" / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")
TipoPrecioEsquema = Literal[
    'precio_unidad_normal', 'precio_docena_normal', 'precio_mayor_normal',
    'precio_unidad_dist', 'precio_docena_dist', 'precio_mayor_dist',
]

class RecommendRequest(BaseModel):
    id_producto: int
    id_cliente: Optional[int] = None
    id_almacen: Optional[int] = None
    tipo_precio: TipoPrecioEsquema = 'precio_unidad_normal'

class ProductRecommendation(BaseModel):
    id: int
    codigo: str
    descripcion: str
    precio: float
    stock: float
    similarityScore: float
    categoria: str
    margen: float | None

class RecommendResponse(BaseModel):
    similar: list[ProductRecommendation]
    upsell: list[ProductRecommendation]
    equilibrio: list[ProductRecommendation]

@dataclass(frozen=True)
class ModelSnapshot:
    products: tuple[dict[str, Any], ...]
    matrix: Any

MODEL: Optional[ModelSnapshot] = None
TRAIN_LOCK = Lock()

def get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL no configurada")
    # schema es un parámetro de Prisma y no pertenece al DSN de libpq.
    url = urlsplit(DATABASE_URL)
    query = urlencode([(key, value) for key, value in parse_qsl(url.query) if key != 'schema'])
    dsn = urlunsplit((url.scheme, url.netloc, url.path, query, url.fragment))
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor, connect_timeout=5)

def fetch_products(id_almacen=None):
    # El ranking siempre usa precios y stock vigentes de stock_actual.
    with closing(get_db_connection()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.id_producto, p.codigo, p.descripcion, p.foto_url,
                    COALESCE(s.stock, 0) AS stock_total,
                    COALESCE(c.nombre_categoria, 'GENERAL') AS nombre_categoria,
                    COALESCE(pa.costo_normal, 0) AS costo_normal,
                    COALESCE(pa.costo_distribuidor, 0) AS costo_distribuidor,
                    COALESCE(pa.precio_unidad_normal, 0) AS precio_unidad_normal,
                    COALESCE(pa.precio_docena_normal, 0) AS precio_docena_normal,
                    COALESCE(pa.precio_mayor_normal, 0) AS precio_mayor_normal,
                    COALESCE(pa.precio_unidad_dist, 0) AS precio_unidad_dist,
                    COALESCE(pa.precio_docena_dist, 0) AS precio_docena_dist,
                    COALESCE(pa.precio_mayor_dist, 0) AS precio_mayor_dist
                FROM productos p
                LEFT JOIN precios_actuales pa ON pa.id_producto=p.id_producto
                LEFT JOIN categorias c ON c.id_categoria=p.id_categoria
                LEFT JOIN (
                    SELECT id_producto, SUM(cantidad) AS stock FROM stock_actual
                    WHERE (%s::int IS NULL OR id_almacen=%s) GROUP BY id_producto
                ) s ON s.id_producto=p.id_producto
                WHERE p.activo=true AND p.deleted_at IS NULL
                ORDER BY p.id_producto
            """, (id_almacen, id_almacen))
            return cursor.fetchall()

def obtener_precio_y_costo(prod, tipo_precio):
    costo = 'costo_distribuidor' if tipo_precio.endswith('_dist') else 'costo_normal'
    return Decimal(str(prod.get(tipo_precio) or 0)), Decimal(str(prod.get(costo) or 0))

def calcular_margen(precio, costo):
    p, c = Decimal(str(precio)), Decimal(str(costo))
    if not p.is_finite() or not c.is_finite() or p < 0 or c < 0:
        raise ValueError('Precio/costo inválidos')
    if p == 0:
        return None
    return float(((p-c)/p*Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def load_products_and_train_tfidf():
    global MODEL
    with TRAIN_LOCK:
        products = tuple(fetch_products())
        matrix = None
        if products:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2))
            matrix = vectorizer.fit_transform([
                str(p['descripcion']) + ' ' + str(p['nombre_categoria']) for p in products
            ])
        # Publicación única: una solicitud nunca mezcla catálogo nuevo y matriz anterior.
        MODEL = ModelSnapshot(products, matrix)
        return len(products)

@app.on_event("startup")
def startup_event():
    try:
        load_products_and_train_tfidf()
    except Exception:
        logger.exception("No se pudo inicializar TF-IDF")

@app.get('/health')
def health_check():
    if MODEL is None:
        raise HTTPException(status_code=503, detail='Modelo no inicializado')
    return {'status': 'ok', 'service': 'goldcontinent-ai', 'total_productos': len(MODEL.products)}

@app.post('/admin/refresh-cache')
def refresh_cache():
    try:
        total = load_products_and_train_tfidf()
    except Exception as exc:
        logger.exception('No se pudo actualizar TF-IDF')
        raise HTTPException(status_code=503, detail='No se pudo actualizar el modelo') from exc
    return {'status': 'success', 'total_productos': total}

@app.post('/suggest', response_model=RecommendResponse)
def suggest(req: RecommendRequest):
    model = MODEL
    if model is None:
        raise HTTPException(status_code=503, detail='Modelo no inicializado')
    empty = {'similar': [], 'upsell': [], 'equilibrio': []}
    if not model.products:
        return empty
    target_idx = next((i for i, p in enumerate(model.products) if p['id_producto']==req.id_producto), None)
    if target_idx is None:
        return empty
    try:
        current = {p['id_producto']: p for p in fetch_products(req.id_almacen)}
    except Exception as exc:
        raise HTTPException(status_code=503, detail='No se pudo consultar disponibilidad') from exc
    target = current.get(req.id_producto)
    if target is None:
        return empty
    target_price, _ = obtener_precio_y_costo(target, req.tipo_precio)
    similarities = cosine_similarity(model.matrix[target_idx], model.matrix).flatten()
    candidates = []
    for idx, cached in enumerate(model.products):
        prod = current.get(cached['id_producto'])
        if idx==target_idx or prod is None:
            continue
        price, cost = obtener_precio_y_costo(prod, req.tipo_precio)
        candidates.append({
            'id': prod['id_producto'], 'codigo': prod['codigo'], 'descripcion': prod['descripcion'], 
            'foto_url': prod.get('foto_url') if prod.get('foto_url') else '',
            'precio': price, 'stock': float(prod['stock_total']),
            'similarityScore': round(float(similarities[idx]), 4),
            'categoria': prod['nombre_categoria'], 'margen': calcular_margen(price, cost),
        })
    similar = sorted(candidates, key=lambda p: p['similarityScore'], reverse=True)[:3]
    upsell = sorted([p for p in candidates if p['precio']>=target_price*Decimal('1.05') and p['similarityScore']>0.05],
                    key=lambda p: (p['margen'] if p['margen'] is not None else float('-inf'), p['precio']), reverse=True)[:3]
    def score(p):
        return p['similarityScore']*.5 + min(max((p['margen'] if p['margen'] is not None else 0)/100, 0), 1)*.35 + (p['stock']>0)*.15
    equilibrio = sorted(candidates, key=score, reverse=True)[:3]
    
    # Build response ensuring foto_url is included
    similar_with_foto = [{**item, 'foto_url': item.get('foto_url', '')} for item in similar]
    upsell_with_foto = [{**item, 'foto_url': item.get('foto_url', '')} for item in upsell]
    equilibrio_with_foto = [{**item, 'foto_url': item.get('foto_url', '')} for item in equilibrio]
    
    return {'similar': similar_with_foto, 'upsell': upsell_with_foto, 'equilibrio': equilibrio_with_foto}
