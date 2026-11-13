'use client';

import { useState, type DragEvent } from 'react';

import { CloudUpload, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { handleImageError } from '@/lib/imageUtils';

/** Límite del endpoint de subida (/productos/upload → 5 MB). */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Formatos aceptados por el backend (/productos/upload: JPEG, PNG y WebP). */
const ACCEPTED_TYPES = /^image\/(jpeg|png|webp)$/;
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

const INPUT_ID = 'producto-imagen-input';

/** El input vive en `sr-only`, así que el foco se refleja en el contenedor con `peer`. */
const FOCUS_RING =
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring';

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
 * - Vacía: dropzone con icono, instrucción y límite de formato/peso.
 * - Con imagen: tarjeta con miniatura ampliada, nombre del archivo y acciones.
 * Accesible: input real enfocable (Enter/Espacio abren el picker), drag & drop
 * y validación de formato/peso con mensaje `role="alert"`.
 */
export function ImageUploader({
  previewUrl,
  fileName: _fileName,
  onFileSelect,
  onRemove,
  disabled = false,
}: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (disabled || !files || files.length === 0) return;
    const file = files[0];

    const isImage =
      ACCEPTED_TYPES.test(file.type) || ACCEPTED_EXTENSIONS.test(file.name);
    if (!isImage) {
      setError('Formato no admitido. Usa una imagen PNG, JPG o WEBP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('La imagen supera el máximo de 5 MB.');
      return;
    }

    setError(null);
    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent) => e.preventDefault();
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    // `relative` contiene al input `sr-only` (absoluto): evita saltos de scroll
    // del cuerpo del modal al enfocar el disparador del selector de archivos.
    <div className="relative w-full">
      <input
        type="file"
        id={INPUT_ID}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        accept=".jpg,.jpeg,.png,.webp"
        className="peer sr-only"
        aria-label="Seleccionar imagen del producto"
        disabled={disabled}
      />

      {previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'relative w-full h-full min-h-[104px] rounded-xl border border-border-default bg-[#FBFCFD] overflow-hidden group flex items-center justify-center',
            FOCUS_RING,
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          <img
            src={previewUrl}
            alt="Vista previa"
            className="w-full h-full object-cover"
            onError={(e) => handleImageError(e, '150')}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
            <label
              htmlFor={INPUT_ID}
              title="Cambiar imagen"
              className="cursor-pointer p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#414141] transition-colors"
              aria-label="Cambiar imagen"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </label>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              title="Quitar imagen"
              aria-label="Quitar imagen del producto"
              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-danger transition-colors cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={INPUT_ID}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'group w-full h-full min-h-[104px] rounded-xl border border-dashed border-[#D9D9D9] bg-[#FBFCFD] hover:border-[#F8B602] p-2 flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-colors',
            FOCUS_RING,
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          <CloudUpload className="size-4 text-[#F8B602]" aria-hidden="true" />
          <span className="text-[11px] font-bold text-[#414141] leading-tight">Subir imagen</span>
          <span className="text-[9px] text-[#8D8D8D]">PNG, JPG · 5MB</span>
        </label>
      )}

      {error && (
        <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
