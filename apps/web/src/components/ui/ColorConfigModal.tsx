'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ColorItem {
  hex: string;
  name: string;
}

interface ColorConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (colors: ColorItem[]) => void;
  initialColors: ColorItem[];
}

const COLOR_MAP: Record<string, string> = {
  'rojo': '#ef4444',
  'azul': '#3b82f6',
  'verde': '#22c55e',
  'amarillo': '#eab308',
  'naranja': '#f97316',
  'morado': '#a855f7',
  'rosa': '#ec4899',
  'blanco': '#ffffff',
  'negro': '#000000',
  'gris': '#6b7280',
  'celeste': '#0ea5e9',
  'marron': '#8b4513',
  'dorado': '#f59e0b',
  'plata': '#9ca3af',
  'vino': '#7f1d1d',
  'lila': '#d8b4e2'
};

export function ColorConfigModal({ open, onClose, onSave, initialColors }: ColorConfigModalProps) {
  const [colors, setColors] = useState<ColorItem[]>(initialColors);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('#ef4444');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleNameChange = (val: string) => {
    setNewName(val);
    const mappedHex = COLOR_MAP[val.toLowerCase().trim()];
    if (mappedHex) {
      setNewHex(mappedHex);
    }
  };

  useEffect(() => {
    setColors(initialColors);
  }, [initialColors]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      setIsAdding(false);
      setNewName('');
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && newName.trim()) {
      addColor();
    }
  };

  const addColor = () => {
    const trimmed = newName.trim();
    if (trimmed && !colors.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setColors([...colors, { name: trimmed, hex: newHex }]);
      setNewName('');
      setIsAdding(false);
    }
  };

  const removeColor = (colorName: string) => {
    setColors(colors.filter(c => c.name !== colorName));
  };

  const handleSave = () => {
    onSave(colors);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[500px] bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">
            Configuración de colores
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            COLORES EN CAJA SURTIDA:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {colors.map((color) => (
              <div
                key={color.name}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 shadow-sm"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.hex }} />
                <span>{color.name}</span>
                <button
                  onClick={() => removeColor(color.name)}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {isAdding ? (
              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                <input 
                  type="color" 
                  value={newHex} 
                  onChange={(e) => setNewHex(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nombre color"
                  autoFocus
                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded outline-none focus:border-amber-500"
                />
                <button onClick={addColor} className="text-xs font-bold text-amber-500 hover:text-amber-600 px-1">OK</button>
                <button onClick={() => setIsAdding(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600 px-1"><X className="w-3 h-3"/></button>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="text-sm font-medium text-amber-500 hover:text-amber-600 underline underline-offset-2 ml-1"
              >
                Añadir color
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center md:justify-end gap-4 px-6 py-5">
          <button
            onClick={onClose}
            className="text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2.5 text-sm font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}