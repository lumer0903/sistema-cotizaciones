from flask import Flask, request, jsonify
import mysql.connector, os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

def get_db():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST','localhost'),
        user=os.getenv('DB_USER','root'),
        password=os.getenv('DB_PASSWORD',''),
        database=os.getenv('DB_NAME','goldcontinent')
    )

@app.route('/recomendar', methods=['POST'])
def recomendar():
    data = request.json
    id_producto = data.get('id_producto')
    tipo_precio = data.get('tipo_precio', 'normal')
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id_producto, descripcion FROM productos WHERE activo=1")
        productos = cursor.fetchall()
        if not productos:
            return jsonify([])
        descripciones = [p['descripcion'] or '' for p in productos]
        ids = [p['id_producto'] for p in productos]
        idx = ids.index(id_producto) if id_producto in ids else 0
        vec = TfidfVectorizer()
        mat = vec.fit_transform(descripciones)
        sims = cosine_similarity(mat[idx], mat).flatten()
        top = sorted(zip(ids, sims), key=lambda x: -x[1])[1:6]
        return jsonify([{'id_producto': i, 'similitud': round(float(s),4)} for i,s in top])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)