'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2 } from 'lucide-react';
import { Modal, ModalFooter, Input, Button } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/lib/authProvider';
import { showToast } from '@/lib/toast';
import { fileToDataUrl, validateAvatarFile } from '@/lib/imageUtils';

interface PerfilModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Perfil en SOLO LECTURA (nombre, correo y rol no se editan aquí).
 * La foto SÍ se gestiona: al elegirla se sube al backend (PATCH /auth/avatar)
 * y el contexto de auth actualiza el usuario, reflejando el cambio en el
 * Header y en este modal de forma inmediata.
 */
export function PerfilModal({ open, onClose }: PerfilModalProps) {
  const { usuario, updateUsuario } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const foto = usuario?.avatar_url || null;
  const iniciales = (usuario?.nombre || 'U')
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handlePick = async (file: File | undefined | null) => {
    if (!file || uploading) return;
    const err = validateAvatarFile(file);
    if (err) {
      showToast.error(err);
      return;
    }
    try {
      setUploading(true);
      const dataUrl = await fileToDataUrl(file);
      const res = await apiClient('/auth/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: dataUrl }),
      });
      // El backend devuelve la sesión actualizada → se refleja en Header y modal
      updateUsuario(res.data.usuario);
      showToast.success('Foto actualizada');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudo subir la foto');
    } finally {
      setUploading(false);
      // Permite volver a elegir el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (uploading) return;
    try {
      setUploading(true);
      const res = await apiClient('/auth/avatar', { method: 'DELETE' });
      updateUsuario(res.data.usuario);
      showToast.success('Foto eliminada');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Perfil"
      closeDisabled={uploading}
      footer={
        <ModalFooter className="justify-end">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cerrar
          </Button>
        </ModalFooter>
      }
    >
      {/* Sin p-4: el contenedor del Modal ya aplica px-4/6 py-4 */}
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {/* Avatar circular perfecto: imagen O iniciales (mutuamente excluyentes) */}
          <div className="relative w-24 h-24">
            {foto ? (
              <Image
                src={foto}
                alt={`Foto de ${usuario?.nombre || 'usuario'}`}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full overflow-hidden relative bg-zinc-200 border-2 border-zinc-100 object-cover"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full overflow-hidden relative bg-zinc-200 border-2 border-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-2xl select-none"
                aria-hidden="true"
              >
                {iniciales}
              </div>
            )}
            {/* Acción superpuesta en la esquina: contraste sobre amarillo = on-brand (10.1:1) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-brand-primary text-on-brand border-2 border-white shadow-sm flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-60"
              title="Cambiar foto"
              aria-label="Cambiar foto"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => void handlePick(e.target.files?.[0])}
          />

          {foto && (
            <button
              type="button"
              onClick={() => void handleRemovePhoto()}
              disabled={uploading}
              className="text-xs text-danger underline cursor-pointer disabled:opacity-50"
            >
              Quitar
            </button>
          )}
        </div>

        {/* Datos del perfil: SOLO LECTURA */}
        <div className="space-y-2" aria-label="Datos del perfil (solo lectura)">
          <Input label="Nombre" value={usuario?.nombre || ''} disabled />
          <Input label="Correo" type="email" value={usuario?.email || ''} disabled />
          <Input label="Rol" value={usuario?.rol || ''} disabled />
        </div>
      </div>
    </Modal>
  );
}
