# Apartado 2 — Lógica y Algoritmos de Recomendación (Inteligencia Artificial)

**Proyecto:** Sistema de Información Web para Incrementar la Eficiencia de la Gestión de Cotizaciones en Importaciones y Exportaciones Gold Continent EIRL

**Técnica utilizada:** TF-IDF (bigramas) + **Similitud del Coseno** con `scikit-learn`

---

## 2.1 Ubicación del código

| Capa | Archivo | Función principal |
|---|---|---|
| Motor de IA | `apps/ai-service/app/main.py` | Vectorización TF-IDF, coseno, ranking (191 líneas) |
| Cliente HTTP | `apps/api/src/modules/ai/infrastructure/clients/http-ai.service.ts` | `POST /suggest`, timeouts, modo mock |
| Caso de uso | `apps/api/src/modules/ai/application/use-cases/get-ai-quote-suggestions.u...ts` | Sugestiones de cotización |
| Contrato | `apps/api/src/modules/ai/domain/contracts/ai-service.interface.ts` | `IAiService`, `AiRecommendationResponse` |
| Enriquecimiento/auditoría | `apps/api/src/modules/cotizaciones/recomendaciones/recomendaciones.service.ts` | Validación, precios reales, log en BD |
| DTO de entrada | `apps/api/src/modules/cotizaciones/recomendaciones/dto/recomendar-item.dto.ts` | Parámetros del asesor |
| Registro de decisión | `apps/api/src/modules/cotizaciones/recomendaciones/dto/registrar-accion-ia.dto.ts` | ACEPTADO / RECHAZADO |
| Controlador | `apps/api/src/modules/cotizaciones/recomendaciones/recomendaciones.controller.ts` | `POST cotizaciones/recomendar-item`, `POST cotizaciones/registrar-accion-ia` |
| Interfaz de usuario | `apps/web/src/features/cotizaciones/components/RecomendacionesPanel.tsx` | Panel de 3 pestañas |
| Reentrenamiento | `apps/api/src/modules/ai/infrastructure/ai-cache-refresh.service.ts` | `POST /admin/refresh-cache` tras crear/editar productos |

---

## 2.2 Flujo completo cuando la asesora solicita recomendaciones

```
1. Asesora selecciona un producto en el carrito
        │
2. RecomendacionesPanel.tsx → apiFetch('cotizaciones/recomendar-item', {
       id_producto_base, id_cliente, id_almacen, tipo_precio, tipo_venta, id_cotizacion })
        │
3. RecomendacionesService.recomendarItem()  (recomendaciones.service.ts:55)
       ├─ valida producto base en BD (:60-67)
       ├─ resolverEsquemaPrecio(tipo_precio, tipo_venta) → 1 de 6 esquemas (:71)
       ├─ HttpAiService.recommendItem() → POST http://localhost:8000/suggest (:75-80)
       ├─ enrichRecommendations() — precios/stock reales (:83)
       └─ logIaInteraccion() — fila en ia_interacciones (:92)
        │
4. FastAPI /suggest (main.py:146)
       ├─ busca el índice del producto en el snapshot TF-IDF
       ├─ cosine_similarity(fila_objetivo, matriz)
       ├─ arma candidates (precio, stock, score, margen, foto_url)
       └─ devuelve { similar[3], upsell[3], equilibrio[3] }
        │
5. Backend enriquece con BD y devuelve + id_interaccion
        │
6. Panel muestra 3 pestañas (SIMILAR / EQUILIBRIO / MEJOR OPCIÓN)
       └─ al aceptar/rechazar → POST cotizaciones/registrar-accion-ia
```

---

## 2.3 Datos de entrada que recibe la API de IA

### 2.3.1 Desde el frontend (endpoint NestJS)

`POST /api/cotizaciones/recomendar-item` — DTO (`recomendar-item.dto.ts`):

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id_producto_base` | int ≥ 1 | Sí | Producto seleccionado por la asesora |
| `id_cliente` | int | No | Determina el régimen de precio (normal/distribuidor) |
| `id_almacen` | int | No | Filtra/consulta el stock del almacén elegido |
| `tipo_precio` | `'normal' \| 'distribuidor'` | No | Tiene prioridad sobre el tipo del cliente |
| `tipo_venta` | string ≤ 20 | No | `UNIDAD \| DOCENA \| MAYOR`; con `tipo_precio` define el esquema |
| `id_cotizacion` | int | No | Para la auditoría en `ia_interacciones` |

### 2.3.2 Hacia FastAPI (`POST /suggest`)

El backend traduce los parámetros a **uno de los 6 esquemas de precio** mediante `resolverEsquemaPrecio()` (`packages/shared/src/constants/descripcion.ts:84‑107`):

```json
POST http://localhost:8000/suggest
{
  "id_producto": 983,
  "id_cliente": 12,
  "id_almacen": 1,
  "tipo_precio": "precio_mayor_dist"
}
```

Modelo Pydantic de entrada (`main.py:31‑36`):

```python
TipoPrecioEsquema = Literal[
    'precio_unidad_normal', 'precio_docena_normal', 'precio_mayor_normal',
    'precio_unidad_dist',   'precio_docena_dist',   'precio_mayor_dist',
]

class RecommendRequest(BaseModel):
    id_producto: int
    id_cliente: Optional[int] = None
    id_almacen: Optional[int] = None
    tipo_precio: TipoPrecioEsquema = 'precio_unidad_normal'
```

> Nota: `normalizarTipoVenta()` acepta el sinónimo **`'caja' ≡ `'mayor'`** (`descripcion.ts:105`).

---

## 2.4 Procesamiento del texto (tokenización, stop-words, TF-IDF)

### 2.4.1 Construcción del corpus

```python
# main.py:63-86 — fetch_products()
SELECT p.id_producto, p.codigo, p.descripcion, p.foto_url,
       COALESCE(s.stock,0) AS stock_total,
       COALESCE(c.nombre_categoria,'GENERAL') AS nombre_categoria,
       COALESCE(pa.costo_normal,0), COALESCE(pa.costo_distribuidor,0),
       COALESCE(pa.precio_unidad_normal,0), ... (los 6 precios)
FROM productos p
LEFT JOIN precios_actuales pa ON pa.id_producto = p.id_producto
LEFT JOIN categorias c       ON c.id_categoria = p.id_categoria
LEFT JOIN (SELECT id_producto, SUM(cantidad) AS stock FROM stock_actual
           WHERE (%s::int IS NULL OR id_almacen=%s) GROUP BY id_producto) s ...
WHERE p.activo = true AND p.deleted_at IS NULL
ORDER BY p.id_producto
```

**Documento de entrenamiento** = `descripcion` + `' '` + `nombre_categoria`:

```python
# main.py:114-119
products = tuple(fetch_products())
if products:
    vectorizer = TfidfVectorizer(ngram_range=(1, 2))
    matrix = vectorizer.fit_transform([
        str(p['descripcion']) + ' ' + str(p['nombre_categoria']) for p in products
    ])
```

Ejemplo de documento: `FLOR ARTIFICIAL EN RAMO X 10 CABEZAS 32 CM FLORES Y PLANTAS ARTIFICIALES`.

### 2.4.2 Tokenización y stop-words (comportamiento exacto)

| Aspecto | Comportamiento actual |
|---|---|
| Tokenizador | Patrón por defecto de scikit-learn: `(?u)\b\w\w+\b` (tokens de **2 o más** caracteres) |
| Minúsculas | `lowercase=True` (por defecto) |
| **Stop-words** | **NINGUNA** — no se pasa `stop_words`, por lo que su valor es `None` |
| N-gramas | **unigramas + bigramas** (`ngram_range=(1,2)`) |
| Lematización / stemming | No existe |
| Normalización morfológica | No existe |

> **Cambio respecto de versiones previas:** en el commit `ab39fcb` el vectorizador era `TfidfVectorizer(stop_words='english')`. En el commit `9e5f189` (versión actual) se reemplazó por `TfidfVectorizer(ngram_range=(1, 2))`, eliminando las stop-words (que además eran **inglesas**, inapropiadas para un catálogo en español) y añadiendo bigramas.

### 2.4.3 Matriz en memoria y publicación atómica

```python
# main.py:47-48 y 112-122
@dataclass(frozen=True)
class ModelSnapshot:
    products: tuple[dict[str, Any], ...]
    matrix: Any

MODEL: Optional[ModelSnapshot] = None
TRAIN_LOCK = Lock()

def load_products_and_train_tfidf():
    global MODEL
    with TRAIN_LOCK:
        products = tuple(fetch_products())
        matrix = None
        if products:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2))
            matrix = vectorizer.fit_transform([...])
        # Publicación única: una solicitud nunca mezcla catálogo nuevo y matriz anterior.
        MODEL = ModelSnapshot(products, matrix)
        return len(products)
```

- Se entrena en el **arranque** del servicio (`@app.on_event("startup")`, `:124‑129`).
- Se reentrena con `POST /admin/refresh-cache` (`:137‑144`), disparado por el backend al crear/editar productos.
- Un candado (`TRAIN_LOCK`) garantiza que ninguna request lea una matriz a medio construir.

### 2.4.4 Similitud del coseno

```python
# main.py:165
similarities = cosine_similarity(model.matrix[target_idx], model.matrix).flatten()
```

Se calcula el coseno entre el **vector del producto objetivo** y **todos** los vectores del catálogo. Los precios y el stock **no** están en el modelo: se releen **en vivo** en cada request (`fetch_products(req.id_almacen)`, `main.py:158`) para no recomendar productos sin disponibilidad ni con precios desactualizados.

---

## 2.5 Reglas de ranking (salida del microservicio)

```python
# main.py:164-191
target_price, _ = obtener_precio_y_costo(target, req.tipo_precio)

candidates = []
for idx, cached in enumerate(model.products):
    prod = current.get(cached['id_producto'])
    if idx == target_idx or prod is None: continue
    price, cost = obtener_precio_y_costo(prod, req.tipo_precio)
    candidates.append({
        'id': ..., 'codigo': ..., 'descripcion': ..., 'foto_url': ...,
        'precio': price, 'stock': float(prod['stock_total']),
        'similarityScore': round(float(similarities[idx]), 4),
        'categoria': prod['nombre_categoria'],
        'margen': calcular_margen(price, cost),
    })

# 1) Mayor similitud del coseno
similar = sorted(candidates, key=lambda p: p['similarityScore'], reverse=True)[:3]

# 2) Upsell: ≥ 5% más caro que el producto base y similitud > 0.05, ordenado por margen
upsell = sorted([p for p in candidates
                 if p['precio'] >= target_price*Decimal('1.05') and p['similarityScore'] > 0.05],
                key=lambda p: (p['margen'] if p['margen'] is not None else float('-inf'), p['precio']),
                reverse=True)[:3]

# 3) Equilibrio: score ponderado
def score(p):
    return (p['similarityScore'] * .5
            + min(max((p['margen'] if p['margen'] is not None else 0)/100, 0), 1) * .35
            + (p['stock'] > 0) * .15)
equilibrio = sorted(candidates, key=score, reverse=True)[:3]
```

| Categoría | Regla | Top |
|---|---|---|
| `similar` | Mayor `similarityScore` | 3 |
| `upsell` | Precio ≥ 1,05 × precio base **y** similitud > 0,05; ordenado por **margen** desc | 3 |
| `equilibrio` | `0,50·similitud + 0,35·margen_normalizado + 0,15·(stock>0)` | 3 |

Cálculo del margen (`main.py:91‑96`):

```python
def calcular_margen(precio, costo):
    p, c = Decimal(str(precio)), Decimal(str(costo))
    if not p.is_finite() or not c.is_finite() or p < 0 or c < 0:
        raise ValueError('Precio/costo inválidos')
    if p == 0: return None
    return float(((p - c) / p * Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
```

`obtener_precio_y_costo()` (`:98‑100`) elige el costo según régimen: `costo_distribuidor` si el esquema termina en `_dist`, si no `costo_normal`.

---

## 2.6 Salida exacta de la API de IA

### 2.6.1 Estructura (`main.py:41‑43`, `RecommendResponse`)

```json
{
  "similar":    [ { "id", "codigo", "descripcion", "precio", "stock",
                    "similarityScore", "categoria", "margen", "foto_url" } ,  ×3 ],
  "upsell":     [ ... ×3 ],
  "equilibrio": [ ... ×3 ]
}
```

```python
# main.py:186-191 — la versión actual fuerza foto_url en cada ítem
similar_with_foto    = [{**item, 'foto_url': item.get('foto_url','')} for item in similar]
upsell_with_foto     = [{**item, 'foto_url': item.get('foto_url','')} for item in upsell]
equilibrio_with_foto = [{**item, 'foto_url': item.get('foto_url','')} for item in equilibrio]
return {'similar': similar_with_foto, 'upsell': upsell_with_foto, 'equilibrio': equilibrio_with_foto}
```

### 2.6.2 ¿Siguen siendo las 3 opciones "Mayor similitud / Más económico / Equilibrio"?

**Sí se mantienen 3 categorías, pero la estructura y los nombres cambiaron:**

| Aspecto | Versión anterior | Versión actual |
|---|---|---|
| Claves JSON | `similar`, `upsell`, `equilibrio` | **Igual** (`similar`, `upsell`, `equilibrio`) |
| Ítems por categoría | **5** | **3** (9 en total) |
| `foto_url` | No existía | **Sí**, en cada ítem |
| Etiquetas en UI | "Mayor similitud" / "Más económico" / "Equilibrio" | **SIMILAR / MEJOR OPCIÓN / EQUILIBRIO** |
| Stop-words | `stop_words='english'` | **Ninguna** + `ngram_range=(1,2)` |

Etiquetas y descripciones actuales de la UI (`RecomendacionesPanel.tsx:65‑95`):

```ts
export const TIPO_CONFIG = {
  similar:   { label: 'SIMILAR',      desc: 'Productos parecidos al seleccionado' },
  equilibrio:{ label: 'EQUILIBRIO',   desc: 'Mejor relación precio-calidad' },
  upsell:    { label: 'MEJOR OPCIÓN', desc: 'Alternativas de mayor valor/margen' },
} as const;
```

> ⚠️ **Precisión conceptual:** `upsell` **no es "el más económico"**. Es el conjunto de productos con precio ≥ 105 % del base y mayor margen (alternativas de mayor valor). La opción "más económica" como categoría **no existe** en la versión actual.

### 2.6.3 Enriquecimiento del backend (lo que finalmente ve la asesora)

`recomendaciones.service.ts:101‑215`:
1. Filtra ítems que **no existan realmente en la BD** (`:145`).
2. Consulta en paralelo `stockActual` (del almacén indicado o el de mayor stock) y `preciosActuales` (`:153‑181`).
3. Usa el precio del **esquema exacto** elegido por la asesora; si es 0, conserva el de la IA (`:184‑187`).
4. Agrega: `imagen_url`, `almacen`, `ubicacion`, `unidades_por_caja`, `es_sugerido_ia: true`.
5. Devuelve además `id_interaccion` (fila creada en `ia_interacciones`).

---

## 2.7 Auditoría de las recomendaciones

### Registro de la recomendación (`logIaInteraccion`, `:217‑247`)

```ts
export const TIPO_SUGERENCIA_IA = 'SIMILITUD_COSENO_TFIDF';

prompt = `Recomendación por ítem: producto_base=…, cliente=…, almacen=…, tipo_precio=…`;
respuesta = JSON.stringify({ similar:[{id,score}], upsell:[…], equilibrio:[…] });

await this.prisma.iaInteracciones.create({
  data: { id_producto, id_usuario, tipo_sugerencia: TIPO_SUGERENCIA_IA,
          id_cotizacion, prompt, respuesta }
});
```

### Registro de la decisión de la asesora

`POST /api/cotizaciones/registrar-accion-ia` → `registrarAccionIa()` (`:255‑293`):

```ts
export interface AccionIaRequest {
  id_interaccion: number;
  accion: 'ACEPTADO' | 'RECHAZADO';
  id_cotizacion?: number;
  id_producto_sugerido?: number;
}
```
Regla de negocio: **ACEPTADO siempre sobrescribe**; **RECHAZADO solo se aplica si aún no existe decisión** (no pisa una aceptación posterior) — `:273‑281`.

**Estado medido en BD:** 40 filas en `ia_interacciones`, **0** con `accion_usuario` registrado aún.

---

## 2.8 Número total de productos que cubre el motor

**No existe un número fijo en el código ni una variable de configuración.** El motor indexa dinámicamente todos los productos activos:

```python
# main.py:63-86
WHERE p.activo = true AND p.deleted_at IS NULL
```

Y el total se expone en tiempo de ejecución:

| Endpoint | Respuesta |
|---|---|
| `GET /health` (`main.py:131‑135`) | `{'status':'ok','service':'goldcontinent-ai','total_productos': N}` o **503** si no hay modelo |
| `POST /admin/refresh-cache` (`main.py:137‑144`) | `{'status':'success','total_productos': N}` |

### Cifra medida en la base de datos (consulta directa, oct-2026)

| Métrica | Valor |
|---|---|
| Productos totales en `productos` | **1.695** |
| Productos activos no borrados | **1.664** → **universo que cubre el motor IA** |
| Snapshot histórico `api_response.json` | `total: 977` (captura de una petición anterior) |
| Catálogo importado `archivos_excel/PRODUCTOS-UNIDOS.xlsx.csv` | archivo de importación del catálogo |

> Para obtener la cifra en tiempo real con el sistema levantado: `curl http://localhost:8000/health`.

---

## 2.9 Modo degradación del servicio

| Situación | Comportamiento del backend |
|---|---|
| No hay `AI_SERVICE_URL` ni `IA_URL` | Modo **mock** (`http-ai.service.ts:12‑14`) con 5 ítems ficticios |
| Error/timeout en desarrollo | Fallback a mock + warning en logs (`:48‑50`, `:64‑67`) |
| Error/timeout en producción | **503** ("AI Service is currently unavailable") o **504** (timeout) |
| FastAPI sin modelo cargado | `503 Modelo no inicializado` |
| Catálogo vacío o producto inexistente | Respuesta con las tres listas **vacías** (`main.py:151‑156`) |
