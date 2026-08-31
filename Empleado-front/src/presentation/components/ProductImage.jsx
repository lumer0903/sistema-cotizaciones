import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export function ProductImage({ product, className = 'product-thumb' }) {
  const candidates = [product.foto_url, ...['jpg', 'png', 'jpeg', 'JPG'].map(ext => `/assets/${encodeURIComponent(product.codigo)}.${ext}`)].filter(Boolean);
  const [index, setIndex] = useState(0);
  if (index >= candidates.length) return <span className="img-fallback"><ImageOff /></span>;
  return <img className={className} src={candidates[index]} alt={product.codigo || 'Producto'} onError={() => setIndex(value => value + 1)} />;
}
