'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import { Modal } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/lib/authProvider';
import { fileToDataUrl, validateAvatarFile } from '@/lib/imageUtils';

interface PerfilModalProps {
  open: boolean;
  onClose: () => void;
}

export function PerfilModal({ open, onClose }: PerfilModalProps) {
  const { usuario, refresh } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const avatarUrl = usuario?.avatar_url ?? null;
  const [prevAvatar, setPrevAvatar] = useState<{ open: boolean; url: string | null } | null>(null);

  if (prevAvatar === null || prevAvatar.open !== open || prevAvatar.url !== avatarUrl) {
    setPrevAvatar({ open, url: avatarUrl });
    if (open) setPreview(avatarUrl);
  }

  const handlePick = async (file: File | undefined | null) => {
    if (!file) return;
    const err = validateAvatarFile(file);
    if (err) {
      showToast.error(err);
      return;
    }
    try {
      setPreview(await fileToDataUrl(file));
    } catch {
      showToast.error('No se pudo procesar la imagen');
    }
  };

  const handleRemovePhoto = async () => {
    if (!usuario?.avatar_url) {
      setPreview(null);
      return;
    }
    try {
      setSaving(true);
      await apiClient('/auth/avatar', { method: 'DELETE' });
      setPreview(null);
      await refresh();
      showToast.success('Foto de perfil eliminada');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudo eliminar la foto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Mi perfil" maxWidth="sm">
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Image
                src={preview || 'data:,'}
                alt={usuario?.nombre || 'Foto de perfil'}
                width={96}
                height={96}
                className={`w-24 h-24 rounded-full border-2 border-gray-100 object-cover bg-brand-soft ${preview ? '' : 'hidden'}`}
            />
            {!preview && (
              <div className="w-24 h-24 rounded-full border-2 border-gray-100 bg-brand-soft flex items-center justify-center text-brand-ink font-bold text-2xl">
                {(usuario?.nombre || 'U')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Cambiar foto"
              aria-label="Cambiar foto"
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#F8B602] text-white rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer hover:scale-105 transition"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              void handlePick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          {preview && (
            <button
              type="button"
              onClick={() => void handleRemovePhoto()}
              disabled={saving}
              className="text-xs text-red-500 hover:underline cursor-pointer mt-2 disabled:opacity-50"
            >
              Quitar foto
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-gray-500 tracking-wider">
              NOMBRE COMPLETO
            </span>
            <div className="w-full h-10 px-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center text-sm font-medium text-gray-700 select-none">
              {usuario?.nombre || '—'}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-gray-500 tracking-wider">
              CORREO ELECTRÓNICO
            </span>
            <div className="w-full h-10 px-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center text-sm font-medium text-gray-700 select-none">
              {usuario?.email || '—'}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
