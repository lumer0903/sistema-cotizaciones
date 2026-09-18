import React from 'react'
import ProductCard from './ProductCard'

export interface PriceMatrix {
  unidad: number
  docena: number
  mayor: number
}

export interface Product {
  id: string
  productCode: string
  productName: string
  description: string
  stock: number
  stockStatus: 'alto' | 'bajo' | 'agotado'
  priceDistribuidor: PriceMatrix
  priceStore: PriceMatrix
  imageUrl?: string
}

export interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  onAddToQuote: (product: Product) => void
  onAddFavorite?: (productId: string) => void
  viewMode?: 'grid' | 'list'
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  isEmpty,
  emptyMessage,
  onAddToQuote,
  onAddFavorite,
  viewMode,
}) => {
  const productList = products.length > 0 ? products : []

  if (isLoading) {
    return (
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-6 py-6">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="w-60 h-72 bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (isEmpty || productList.length === 0) {
    return (
      <div className="w-full text-center py-12">
        <span className="text-neutral-500 text-base">
          📦 {emptyMessage || 'No hay productos disponibles'}
        </span>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-6 py-6 bg-gray-50">
        {productList.map((product) => (
          <ProductCard
            key={product.id}
            productCode={product.productCode}
            productName={product.productName}
            description={product.description}
            stock={product.stock}
            stockStatus={product.stockStatus}
            priceDistribuidor={product.priceDistribuidor}
            priceStore={product.priceStore}
            imageUrl={product.imageUrl}
            onAddToQuote={() => onAddToQuote(product)}
            onAddFavorite={() => onAddFavorite?.(product.id)}
          />
        ))}
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="w-full space-y-4">
        <div className="grid grid-cols-6 gap-2 text-xs text-neutral-500 border-b border-gray-200 pb-2">
          <span>Código</span>
          <span>Producto</span>
          <span>Stock</span>
          <span className="col-span-2">Precio Dist.</span>
          <span className="col-span-2">Precio Tienda</span>
          <span>Acciones</span>
        </div>

        {productList.map((product) => (
          <div
            key={product.id}
            className="grid grid-cols-6 gap-2 p-2 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <span className="col-span-1 text-yellow-500 font-black">{product.productCode}</span>
            <span className="col-span-2">
              {product.productName}
            </span>
            <span className="col-span-1">
              {product.stock > 0 ? '●' : 'STOCK: 0'}
            </span>
            <span className="col-span-2 text-orange-800 text-[8px] font-black">
              UNIDAD: S/{product.priceDistribuidor.unidad.toFixed(2)}
            </span>
            <span className="col-span-2 text-blue-800 text-[8px] font-black">
              UNIDAD: S/{product.priceStore.unidad.toFixed(2)}
            </span>
            <span className="col-span-1">
              <button
                className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded"
                onClick={() => onAddToQuote(product)}
              >
                Agregar
              </button>
            </span>
          </div>
        ))}
      </div>
    )
  }

  return null
}

export default ProductGrid