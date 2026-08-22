from flask import Flask, request, jsonify
import psycopg2, os
from psycopg2.extras import RealDictCursor
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

def load_backend_env():
    env_path = Path(__file__).resolve().parent.parent / 'backend' / '.env'
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"\''))

load_backend_env()

def get_db():
    return psycopg2.connect(os.getenv('DATABASE_URL'), cursor_factory=RealDictCursor)

# Definición de stopwords en español
STOP_WORDS_SPANISH = [
    'el', 'la', 'los', 'les', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'y', 'o', 'en', 'con', 'para', 'por',
    'su', 'sus', 'a', 'ante', 'bajo', 'cabe', 'contra', 'desde', 'durante', 'entre', 'hacia', 'hasta', 'mediante',
    'segun', 'sin', 'sobre', 'tras', 'versus', 'via', 'que', 'este', 'esta', 'estos', 'estas', 'mi', 'mis', 'tu', 'tus',
    'yo', 'me', 'nos', 'se', 'ellos', 'ellas', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'cual', 'cuales'
]

@app.route('/recomendar', methods=['POST'])
def recomendar():
    data = request.get_json(silent=True) or {}
    id_producto = data.get('id_producto')
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id_producto, descripcion FROM productos WHERE activo = true")
        productos = cursor.fetchall()
        if not productos:
            return jsonify([])
        descripciones = [p['descripcion'] or '' for p in productos]
        ids = [p['id_producto'] for p in productos]
        if id_producto not in ids or not any(text.strip() for text in descripciones):
            return jsonify([])
        vec = TfidfVectorizer(stop_words=STOP_WORDS_SPANISH)
        mat = vec.fit_transform(descripciones)
        idx = ids.index(id_producto)
        sims = cosine_similarity(mat[idx], mat).flatten()
        top = sorted(((i, s) for i, s in zip(ids, sims) if i != id_producto), key=lambda x: -x[1])[:5]
        return jsonify([{'id_producto': i, 'similitud': round(float(s),4)} for i,s in top])
    except Exception as e:
        app.logger.exception('No se pudieron generar recomendaciones')
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True)