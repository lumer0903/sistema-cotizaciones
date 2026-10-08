'use client';

import React, { useRef } from 'react';

import { CloudUpload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { handleImageError } from '@/lib/imageUtils';

export interface ImageUploaderProps {
  /** URL de previsualización (blob: o remota). */
  previewUrl: string | null;
  /** Nombre del archivo seleccionado (o nombre remoto existente). */
  fileName?: string | null;
  /** Selecciona un archivo nuevo. */
  onFileSelect: (file: File) => void;
  /** Elimina la imagen actual. */
  onRemove: () => void;
  disabled?: boolean;
}


/**
 * Zona de carga de imagen del producto.
 * Accesible: label real asociado al input (Enter/Espacio abren el picker),
 * drag & drop y acción de eliminación como botón con aria-label.
 */
export function ImageUploader({
  previewUrl,
  fileName,
  onFileSelect,
  onRemove,
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (disabled || !files || files.length === 0) return;
    const file = files[0];
    
    // We rely on the input's 'accept' attribute, but do a loose check
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      return;
    }
    
    onFileSelect(file);
  };

  return (
    <div className="w-full flex items-center justify-center">
      <input
        type="file"
        id="producto-imagen-input"
        ref={inputRef}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        accept=".png,.jpg,.jpeg,.webp,image/*"
        className="hidden"
        aria-label="Seleccionar imagen del producto"
        disabled={disabled}
      />

      {previewUrl ? (
        <div className="w-full max-w-[515px] max-h-24 inline-flex justify-between items-center gap-3">
          <label
            htmlFor="producto-imagen-input"
            className="h-12 w-12 relative rounded-lg border border-zinc-200 overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-white"
            title="Cambiar imagen"
          >
            <img
              src={previewUrl}
              alt="Vista previa"
              className="w-full h-full object-cover"
              onError={(e) => handleImageError(e, '150')}
            />
          </label>

          <label
            htmlFor="producto-imagen-input"
            className="flex-1 min-h-11 px-3.5 rounded-lg border border-brand-primary flex justify-start items-center gap-2.5 bg-white cursor-pointer hover:border-brand-hover transition-colors overflow-hidden"
          >
            <span className="text-brand-subtitle text-xs font-medium truncate">
              {fileName || 'imagen.png'}
            </span>
          </label>

          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="size-10 rounded-lg flex justify-center items-center shrink-0 hover:bg-status-rechazado-soft hover:border hover:border-status-rechazado/30 group transition-colors disabled:opacity-40"
            title="Eliminar imagen"
            aria-label="Eliminar imagen del producto"
          >
            <Trash2 className="w-5 h-5 text-danger group-hover:text-danger-hover transition-colors" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="producto-imagen-input"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            'w-full h-20 border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center gap-2 text-brand-options',
            'hover:border-brand-hover hover:text-brand-ink cursor-pointer transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <CloudUpload className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs font-medium">
            Arrastra o selecciona la imagen del producto
          </span>
        </label>
      )}
    </div>
  );
}
