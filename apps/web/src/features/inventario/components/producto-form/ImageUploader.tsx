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
  fileName,
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
            'flex w-full items-center gap-4 rounded-2xl border border-border-default bg-white p-3 shadow-sm transition-colors hover:border-brand-primary/40',
            FOCUS_RING,
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border-default/50 bg-surface-muted shadow-xs">
            <img
              src={previewUrl}
              alt="Vista previa"
              className="h-full w-full object-cover"
              onError={(e) => handleImageError(e, '150')}
            />
          </div>
          
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <p className="truncate text-sm font-bold text-brand-subtitle" title={fileName || 'imagen.png'}>
              {fileName || 'imagen.png'}
            </p>

            <div className="flex shrink-0 items-center gap-2">
              <label
                htmlFor={INPUT_ID}
                title="Cambiar imagen"
                className="flex cursor-pointer items-center justify-center rounded-lg bg-brand-selection p-2.5 text-brand-subtitle transition-colors hover:bg-brand-primary/20 hover:text-brand-ink"
                aria-label="Cambiar imagen"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </label>

              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                title="Quitar imagen"
                aria-label="Quitar imagen del producto"
                className="flex items-center justify-center rounded-lg bg-danger/10 p-2.5 text-danger transition-colors hover:bg-danger/20 disabled:opacity-40"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
<label
            htmlFor={INPUT_ID}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              'group flex min-h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-surface-muted/30 px-4 py-6 text-center transition-[border-color,background-color] hover:border-brand-primary/50 hover:bg-brand-selection/50',
              FOCUS_RING,
              disabled && 'pointer-events-none opacity-50'
            )}
          >
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-selection text-brand-subtitle transition-transform group-hover:scale-110">
            <CloudUpload className="size-6" aria-hidden="true" />
          </span>
          <span className="mt-3 text-sm font-bold text-brand-subtitle">
            Arrastra tu imagen o haz clic para seleccionar
          </span>
          <span className="mt-1 text-xs text-brand-options">
            PNG, JPG o WEBP · máximo 5 MB
          </span>
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
