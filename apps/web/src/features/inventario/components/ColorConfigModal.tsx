'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, FileText } from 'lucide-react';
import { Modal, Button, Textarea, Input } from '@/components/ui';

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
  rojo: '#ef4444',
  azul: '#3b82f6',
  verde: '#22c55e',
  amarillo: '#eab308',
  naranja: '#f97316',
  morado: '#a855f7',
  rosa: '#ec4899',
  blanco: '#ffffff',
  negro: '#000000',
  gris: '#6b7280',
  celeste: '#0ea5e9',
  marron: '#8b4513',
  dorado: '#f59e0b',
  plata: '#9ca3af',
  vino: '#7f1d1d',
  lila: '#d8b4e2',
};

export function ColorConfigModal({ open, onClose, onSave, initialColors }: ColorConfigModalProps) {
  const [colors, setColors] = useState<ColorItem[]>(initialColors);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('#ef4444');
  const [importText, setImportText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (val: string) => {
    setNewName(val);
    const mappedHex = COLOR_MAP[val.toLowerCase().trim()];
    if (mappedHex) setNewHex(mappedHex);
  };

  useEffect(() => {
    setColors(initialColors);
  }, [initialColors]);

  const addColor = () => {
    const trimmed = newName.trim();
    if (trimmed && !colors.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setColors([...colors, { name: trimmed, hex: newHex }]);
      setNewName('');
      setIsAdding(false);
    }
  };

  const parseImportText = (text: string): ColorItem[] => {
    const lines = text.split(/[\n,]/).map(l => l.trim()).filter(Boolean);
    const newColors: ColorItem[] = [];
    for (const line of lines) {
      const name = line.trim();
      if (name && !colors.some((c) => c.name.toLowerCase() === name.toLowerCase()) &&
          !newColors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        const hex = COLOR_MAP[name.toLowerCase()] || '#6b7280';
        newColors.push({ name, hex });
      }
    }
    return newColors;
  };

  const handleImport = () => {
    const parsed = parseImportText(importText);
    if (parsed.length > 0) {
      setColors([...colors, ...parsed]);
      setImportText('');
      setIsImporting(false);
    }
  };

  const removeColor = (colorName: string) => {
    setColors(colors.filter((c) => c.name !== colorName));
  };

  const handleSave = () => {
    onSave(colors);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Configuración de colores" maxWidth="md">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold text-brand-options uppercase tracking-wider mb-4">
            COLORES EN CAJA SURTIDA:
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {colors.map((color) => (
              <div
                key={`${color.name}-${color.hex}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-options/30 rounded-lg text-sm text-brand-subtitle shadow-sm"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.hex }} />
                <span>{color.name}</span>
                <button
                  onClick={() => removeColor(color.name)}
                  className="text-brand-options hover:text-red-500 transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsAdding(true); setIsImporting(false); }}
                className="text-sm font-medium text-brand-subtitle hover:underline underline-offset-2 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir
              </button>
              <button
                onClick={() => { setIsImporting(true); setIsAdding(false); }}
                className="text-sm font-medium text-brand-subtitle hover:underline underline-offset-2 flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                Importar
              </button>
            </div>
          </div>

          {isAdding && (
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-brand-options/30">
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
                onKeyDown={(e) => e.key === 'Enter' && addColor()}
                placeholder="Nombre color"
                autoFocus
                className="w-24 px-2 py-1 text-xs border border-brand-options/30 rounded outline-none focus:border-brand-primary"
              />
              <button onClick={addColor} className="text-xs font-bold text-brand-subtitle hover:text-black px-1">
                OK
              </button>
              <button onClick={() => setIsAdding(false)} className="text-xs font-bold text-brand-options hover:text-brand-subtitle px-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {isImporting && (
            <div className="space-y-2">
              <Textarea
                label="Importar colores (uno por línea o separados por coma)"
                placeholder="Morado, Rosado, Blanco&#10;Lila/Blanco, Melon&#10;Rosado BB, Medio Lila Oscuro Gris, Marron"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={4}
                className="text-xs"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsImporting(false)} size="sm">
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleImport} size="sm">
                  Importar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}