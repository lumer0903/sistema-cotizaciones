import React, { useState } from 'react'
import { Search, List, Grid3x3 } from 'lucide-react'
import { Select } from '@/components/ui/Select'

export interface SearchFilterBarProps {
  onSearch: (query: string) => void
  onPriceTypeChange: (type: 'all' | 'normal' | 'distribuidor') => void
  onStockLevelChange: (level: 'all' | 'alto' | 'bajo' | 'agotado') => void
  onViewChange: (view: 'list' | 'grid') => void
  defaultView?: 'list' | 'grid'
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  onSearch,
  onPriceTypeChange,
  onStockLevelChange,
  onViewChange,
  defaultView,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [priceType, setPriceType] = useState<'all' | 'normal' | 'distribuidor'>('all')
  const [stockLevel, setStockLevel] = useState<'all' | 'alto' | 'bajo' | 'agotado'>('all')
  const [currentView, setCurrentView] = useState<'list' | 'grid'>(
    defaultView || 'grid',
  )

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onSearch(value)
  }

  const handlePriceChange = (e: { target: { value: string | number } }) => {
    const value = String(e.target.value) as 'all' | 'normal' | 'distribuidor';
    setPriceType(value)
    onPriceTypeChange(value)
  }

  const handleStockChange = (e: { target: { value: string | number } }) => {
    const value = String(e.target.value) as 'all' | 'alto' | 'bajo' | 'agotado'
    setStockLevel(value)
    onStockLevelChange(value)
  }

  const handleViewChange = (view: 'list' | 'grid') => {
    setCurrentView(view)
    onViewChange(view)
  }

  const priceTypeOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Normal', value: 'normal' },
    { label: 'Distribuidor', value: 'distribuidor' },
  ]

  const stockLevelOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Alto', value: 'alto' },
    { label: 'Bajo', value: 'bajo' },
    { label: 'Agotado', value: 'agotado' },
  ]

  return (
    <div
      className="w-full bg-white rounded-lg shadow-[3px_3px_10px_0px_rgba(0,0,0,0.04)] border-l-2 border-yellow-500 px-12 py-5 flex justify-between items-center gap-6"
    >
      {/* SECTION 1: BUSCAR (w-96) */}
      <div className="flex flex-col gap-2 w-96">
        <label className="text-yellow-500 text-xs font-black tracking-wide">BUSCAR</label>
        <div className="flex items-center gap-2.5">
          <Search className="w-6 h-6 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por codigo"
            onChange={handleSearch}
            className="outline outline-1 outline-yellow-500 rounded-lg px-3.5 py-2.5 h-10 flex-1 text-neutral-500 placeholder-neutral-500"
          />
        </div>
      </div>

      {/* SECTION 2: TIPO DE PRECIO (w-44) */}
      <div className="flex flex-col gap-2 w-44">
        <label className="text-yellow-500 text-xs font-black tracking-wide">TIPO DE PRECIO</label>
        <Select
          value={priceType}
          onChange={handlePriceChange}
          options={priceTypeOptions}
          sizeVariant="md"
          className="w-full"
        />
      </div>

      {/* SECTION 3: STOCK (w-40) */}
      <div className="flex flex-col gap-2 w-40">
        <label className="text-yellow-500 text-xs font-black tracking-wide">STOCK</label>
        <Select
          value={stockLevel}
          onChange={handleStockChange}
          options={stockLevelOptions}
          sizeVariant="md"
          className="w-full"
        />
      </div>

      {/* SECTION 4: VISTA (w-20, flex con gap-1.5) */}
      <div className="flex items-center gap-1.5 w-20">
        {/* Botón List View */}
        <button
          onClick={() => handleViewChange('list')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${currentView === 'list' ? 'bg-white text-yellow-500 outline outline-1 outline-yellow-500' : 'bg-white text-neutral-400 hover:bg-yellow-50'}`}
        >
          <List className="w-5 h-5" />
        </button>

        {/* Botón Grid View */}
        <button
          onClick={() => handleViewChange('grid')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${currentView === 'grid' ? 'bg-yellow-500/20 outline outline-1 outline-yellow-500 text-yellow-500' : 'bg-white outline outline-1 outline-yellow-500 text-neutral-400'}`}
        >
          <Grid3x3 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default SearchFilterBar