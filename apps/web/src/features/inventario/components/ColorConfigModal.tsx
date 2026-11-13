'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Modal, Textarea } from '@/components/ui';

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

export const COLOR_MAP: Record<string, string> = {
  rojo: '#ef4444',
  rosado: '#ec4899',
  rosa: '#ec4899',
  'rosa pastel': '#f9a8d4',
  azul: '#3b82f6',
  verde: '#22c55e',
  'verde oliva': '#808000',
  'verde eucalipto': '#2e8b57',
  amarillo: '#eab308',
  'amarillo intenso': '#facc15',
  naranja: '#f97316',
  morado: '#a855f7',
  fucsia: '#ff00ff',
  fuscia: '#ff00ff',
  fuchsia: '#ff00ff',
  magenta: '#ff00ff',
  blanco: '#ffffff',
  marfil: '#fffff0',
  negro: '#000000',
  gris: '#6b7280',
  celeste: '#0ea5e9',
  coral: '#ff7f50',
  marron: '#8b4513',
  dorado: '#f59e0b',
  plata: '#9ca3af',
  vino: '#7f1d1d',
  lila: '#d8b4e2',
  menta: '#98ff98',
  durazno: '#ffcba4',
  turquesa: '#40e0d0',
  burdeos: '#800020',
  lavanda: '#e6e6fa',
  beige: '#f5f5dc',
  crema: '#fffdd0',
  durazno_claro: '#ffdab9',
};

const COLOR_ALIASES: Array<{ keys: string[]; hex: string }> = [
  { keys: ['fucsia', 'fuscia', 'fuchsia', 'magenta'], hex: '#ff00ff' },
  { keys: ['rosado', 'rosa', 'pink'], hex: '#ec4899' },
  { keys: ['marfil', 'ivory', 'crema', 'cream'], hex: '#fffff0' },
  { keys: ['verde oliva', 'oliva', 'olive'], hex: '#808000' },
  { keys: ['eucalipto', 'eucalyptus'], hex: '#2e8b57' },
  { keys: ['amarillo intenso', 'amarillo brillante'], hex: '#facc15' },
  { keys: ['burdeos', 'burdeos oscuro'], hex: '#800020' },
  { keys: ['celeste', 'cielo', 'sky'], hex: '#0ea5e9' },
  { keys: ['dorado', 'oro', 'gold'], hex: '#f59e0b' },
  { keys: ['plata', 'silver'], hex: '#9ca3af' },
];

export function resolveColorHex(name: string): string {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized];
  for (const alias of COLOR_ALIASES) {
    if (alias.keys.some((k) => normalized.includes(k))) return alias.hex;
  }
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return hex;
  }
  return '#6b7280';
}

export function ColorConfigModal({ open, onClose, onSave, initialColors }: ColorConfigModalProps) {
  const [colors, setColors] = useState<ColorItem[]>(initialColors);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('#ef4444');
  const [importText, setImportText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevInitialColors, setPrevInitialColors] = useState(initialColors);
  const [prevOpen, setPrevOpen] = useState(open);

  const canSave = colors.length > 0;

  const handleNameChange = (val: string) => {
    setNewName(val);
    const mappedHex = resolveColorHex(val);
    if (mappedHex && mappedHex !== '#6b7280') setNewHex(mappedHex);
  };

  if (prevInitialColors !== initialColors || prevOpen !== open) {
    setPrevInitialColors(initialColors);
    setPrevOpen(open);
    setColors(initialColors);
    setIsAdding(false);
    setIsImporting(false);
    setNewName('');
    setNewHex('#ef4444');
    setImportText('');
  }

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
        const hex = resolveColorHex(name);
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
    setIsSaving(true);
    onSave(colors);
    setIsSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Configuración de colores" maxWidth="md">
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#575757] mb-3">
            COLORES EN CAJA SURTIDA:
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {colors.map((color) => (
              <div
                key={`${color.name}-${color.hex}`}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1 text-xs font-normal text-[#575757]"
              >
                <span
                  className="size-3 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: color.hex || resolveColorHex(color.name) }}
                />
                <span>{color.name}</span>
                <button
                  type="button"
                  onClick={() => removeColor(color.name)}
                  aria-label={`Quitar ${color.name}`}
                  className="size-3.5 inline-flex items-center justify-center text-[#8D8D8D] hover:text-[#414141] transition-colors cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}

            <div className="inline-flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setIsAdding(true); setIsImporting(false); }}
                className="text-xs font-semibold text-[#F8B602] underline underline-offset-4 hover:opacity-80 cursor-pointer"
              >
                Añadir color
              </button>
              <button
                type="button"
                onClick={() => { setIsImporting(true); setIsAdding(false); }}
                className="text-xs font-semibold text-[#8D8D8D] hover:text-[#414141] cursor-pointer"
              >
                Importar colores
              </button>
            </div>
          </div>

          {isAdding && (
            <div className="flex items-center gap-2 bg-[#FBFCFD] border border-[#D9D9D9] rounded-xl p-2 mt-2">
              <label
                className="relative size-6 shrink-0 rounded-full border border-black/15 shadow-2xs cursor-pointer overflow-hidden transition-shadow"
                style={{ backgroundColor: newHex }}
                title="Elegir color"
              >
                <input
                  type="color"
                  value={newHex}
                  aria-label="Seleccionar color"
                  onChange={(e) => setNewHex(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addColor()}
                placeholder="Nombre del color"
                aria-label="Nombre del color"
                autoComplete="off"
                autoFocus
                className="flex-1 h-8 px-2.5 text-xs rounded-lg border border-[#D9D9D9] bg-white text-[#414141] placeholder:text-[#8D8D8D] focus:border-[#414141] focus:outline-none"
              />
              <button
                type="button"
                onClick={addColor}
                className="h-8 px-3 rounded-lg bg-[#F8B602] hover:bg-[#e0a402] text-xs font-black text-white cursor-pointer transition-colors"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                aria-label="Cancelar alta de color"
                className="size-7 inline-flex items-center justify-center text-[#8D8D8D] hover:text-[#414141] cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {isImporting && (
            <div className="space-y-2 bg-[#FBFCFD] border border-[#D9D9D9] rounded-xl p-2.5 mt-2">
              <Textarea
                label="Importar colores (uno por línea o separados por coma)"
                placeholder="Morado, Rosado, Blanco&#10;Lila/Blanco, Melon"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={3}
                className="text-xs"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImporting(false)}
                  className="text-xs font-semibold text-[#8D8D8D] hover:text-[#414141] cursor-pointer px-2 py-1"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  className="h-7 px-3 rounded-lg bg-[#F8B602] hover:bg-[#e0a402] text-xs font-black text-white cursor-pointer transition-colors"
                >
                  Importar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F3F4F6]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-[#8D8D8D] hover:text-[#414141] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="h-8 px-5 rounded-lg bg-[#F8B602] hover:bg-[#e0a402] text-xs font-black text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}