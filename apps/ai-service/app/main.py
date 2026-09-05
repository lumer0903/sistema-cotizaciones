import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
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

class RecommendRequest(BaseModel):
    id_producto: int

class RecommendResponse(BaseModel):
    id_producto: int
    similitud: float

def load_products():
    global product_ids, descriptions, vectorizer, tfidf_matrix
    
    conn = db_pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id_producto, descripcion FROM productos WHERE activo = true")
            rows = cur.fetchall()
            product_ids = [r['id_producto'] for r in rows]
            descriptions = [r['descripcion'] or "" for r in rows]
    finally:
        db_pool.putconn(conn)
    
    if descriptions and any(d.strip() for d in descriptions):
        vectorizer = TfidfVectorizer(stop_words=STOP_WORDS_SPANISH)
        tfidf_matrix = vectorizer.fit_transform(descriptions)
        print(f"TF-IDF matrix computed: {tfidf_matrix.shape[0]} products, {tfidf_matrix.shape[1]} features")
    else:
        print("No products with descriptions found")

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

@app.post("/recomendar", response_model=list[RecommendResponse])
async def recomendar(req: RecommendRequest):
    if tfidf_matrix is None or req.id_producto not in product_ids:
        return []
    
    idx = product_ids.index(req.id_producto)
    sims = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    
    top = sorted(
        ((i, s) for i, s in zip(product_ids, sims) if i != req.id_producto),
        key=lambda x: -x[1]
    )[:5]
    
    return [{"id_producto": i, "similitud": round(float(s), 4)} for i, s in top]

@app.post("/admin/refresh-cache")
async def refresh_cache():
    load_products()
    return {"status": "ok", "products_loaded": len(product_ids) if product_ids else 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)