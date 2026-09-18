import React from 'react'
import { ShoppingCart, Heart } from 'lucide-react'

export interface PriceMatrix {
  unidad: number
  docena: number
  mayor: number
}

export interface ProductCardProps {
  productCode: string
  productName: string
  description: string
  stock: number
  stockStatus: 'alto' | 'bajo' | 'agotado'
  priceDistribuidor: PriceMatrix
  priceStore: PriceMatrix
  imageUrl?: string
  onAddToQuote?: () => void
  onAddFavorite?: () => void
}

const ProductCard: React.FC<ProductCardProps> = ({
  productCode,
  productName,
  description,
  stock,
  stockStatus,
  priceDistribuidor,
  priceStore,
  imageUrl,
  onAddToQuote,
  onAddFavorite,
}) => {
  const isStockAvailable = stock > 0

  const stockBadgeClassName =
    stockStatus === 'alto'
      ? 'bg-green-600 text-white rounded-full px-2 py-0.5 text-[8px] font-black'
      : stockStatus === 'bajo'
      ? 'bg-yellow-500 text-white rounded-full px-2 py-0.5 text-[8px] font-black'
      : 'bg-red-600 text-white rounded-full px-2 py-0.5 text-[8px] font-black'

  const priceStyle = 'text-[8px] font-black'
  const labelStyle = 'text-[5px] font-black'

  return (
    <div
      className="w-60 h-72 bg-white rounded-lg shadow-[3px_3px_10px_0px_rgba(0,0,0,0.25)] overflow-hidden hover:shadow-lg cursor-pointer transition-shadow"
      onClick={onAddToQuote}
    >
      {/* SECCIÓN 1: IMAGEN PLACEHOLDER (h-24) */}
      <div className="h-24 bg-yellow-100 flex items-center justify-center relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-yellow-200 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M12 15v2m-6-6h.01M6 12a4 4 0 014-4h.01M6 12a4 4 0 104 4m0 0a4 4 0 01-4 4m-6 8h.01M16 12a4 4 0 014-4h.01M16 12a4 4 0 10-4 4m-.01 0a4 4 0 01-4-4"
              />
            </svg>
          </div>
        )}
        <Heart
          className="absolute w-4 h-4 text-yellow-500 top-2 right-2 hover:text-red-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onAddFavorite?.()
          }}
        />
      </div>

      {/* SECCIÓN 2: HEADER PRODUCTO (p-3) */}
      <div className="p-3 flex justify-between items-start gap-2">
        <div>
          <span className="text-yellow-500 text-xs font-black">{productCode}</span>
          <span className="text-gray-400 text-xs font-light">{description}</span>
        </div>
        <div className="flex items-center gap-1">
          {isStockAvailable ? (
            <span className={stockBadgeClassName}>
              ● {stock}
            </span>
          ) : (
            <span className={stockBadgeClassName.replace('green-600', 'red-600')}>
              STOCK: {stock}
            </span>
          )}
        </div>
      </div>

      {/* SECCIÓN 3: PRECIO DISTRIBUIDOR (p-2.5, bg-orange-50, border border-orange-200, rounded-lg, mx-3, my-2) */}
      <div
        className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg mx-3 my-2"
      >
        <span className="text-orange-800 text-[8px] font-black">PRECIO DISTRIBUIDOR</span>
        <div className="grid grid-cols-3 gap-2 my-2">
          <div className="flex flex-col items-center">
            <span className={labelStyle}>UNIDAD</span>
            <span className={priceStyle}>S/{priceDistribuidor.unidad.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={labelStyle}>DOCENA</span>
            <span className={priceStyle}>S/{priceDistribuidor.docena.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={labelStyle}>MAYOR</span>
            <span className={priceStyle}>S/{priceDistribuidor.mayor.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: PRECIO TIENDA (p-2.5, bg-indigo-50, border border-blue-200, rounded-lg, mx-3, my-2) */}
      <div
        className="p-2.5 bg-indigo-50 border border-blue-200 rounded-lg mx-3 my-2"
      >
        <span className="text-blue-800 text-[8px] font-black">PRECIO TIENDA</span>
        <div className="grid grid-cols-3 gap-2 my-2">
          <div className="flex flex-col items-center">
            <span className={labelStyle}>UNIDAD</span>
            <span className={priceStyle}>S/{priceStore.unidad.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={labelStyle}>DOCENA</span>
            <span className={priceStyle}>S/{priceStore.docena.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={labelStyle}>MAYOR</span>
            <span className={priceStyle}>S/{priceStore.mayor.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 5: FOOTER ACCIONES (p-2, flex gap-2, justify-center) */}
      <div
        className="p-2 flex gap-2 justify-center"
      >
        <button
          className="flex-1 bg-yellow-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-600 transition-colors"
          onClick={onAddToQuote}
        >
          <ShoppingCart className="w-4 h-4" /> Agregar a cotización
        </button>
      </div>
    </div>
  )
}

export default ProductCard