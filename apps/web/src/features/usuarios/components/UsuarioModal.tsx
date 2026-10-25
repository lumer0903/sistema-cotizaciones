'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Trash2 } from 'lucide-react';
import { Modal, Input, Select, Button, Avatar, ModalFooter } from '@/components/ui';
import { showToast } from '@/lib/toast';
import { createUsuario, updateUsuario, UsuarioLista } from '../api/usuariosApi';
import { getRoles, RolLista } from '../api/rolesApi';
import { fileToDataUrl, validateAvatarFile } from '@/lib/imageUtils';
import { useAuth } from '@/lib/authProvider';

const buildSchema = (isEdit: boolean) =>
  z
    .object({
      nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
      email: z.string().email('Email inválido'),
      rol: z.string().min(2, 'Selecciona un rol'),
      password: isEdit
        ? z.string().optional().or(z.literal(''))
        : z.string().min(6, 'Mínimo 6 caracteres'),
      passwordConfirm: isEdit
        ? z.string().optional().or(z.literal(''))
        : z.string(),
    })
    .superRefine((data, ctx) => {
      if (!isEdit) {
        if (data.password !== data.passwordConfirm) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['passwordConfirm'],
            message: 'Las contraseñas no coinciden',
          });
        }
        return;
      }
      if (data.password && data.password.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Mínimo 6 caracteres',
        });
      }
      if (data.password !== data.passwordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['passwordConfirm'],
          message: 'Las contraseñas no coinciden',
        });
      }
    });

type UsuarioFormInput = z.infer<ReturnType<typeof buildSchema>>;

interface UsuarioModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usuario?: UsuarioLista | null;
}

export function UsuarioModal({ open, onClose, onSuccess, usuario }: UsuarioModalProps) {
  const isEdit = Boolean(usuario);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [roles, setRoles] = useState<RolLista[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(usuario?.avatar_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { usuario: me, refresh } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UsuarioFormInput>({
    resolver: zodResolver(buildSchema(isEdit)),
    defaultValues: {
      nombre: usuario?.nombre ?? '',
      email: usuario?.email ?? '',
      rol: usuario?.rol ?? 'vendedor',
      password: '',
      passwordConfirm: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    getRoles()
      .then((data) => {
        const activos = data.filter((r) => r.activo || r.codigo === usuario?.rol);
        setRoles(activos);
      })
      .catch(() => {
        setRoles([
          { id_rol: 1, nombre: 'Administrador', codigo: 'admin', es_sistema: true, orden: 0, activo: true },
          { id_rol: 2, nombre: 'Gerente', codigo: 'gerente', es_sistema: true, orden: 1, activo: true },
          { id_rol: 3, nombre: 'Vendedor', codigo: 'vendedor', es_sistema: true, orden: 2, activo: true },
        ]);
      });
  }, [open, usuario?.rol]);

  const [prevOpenForm, setPrevOpenForm] = useState(open);
  const [prevUsuarioForm, setPrevUsuarioForm] = useState<UsuarioLista | null | undefined>(usuario);
  if (prevOpenForm !== open || prevUsuarioForm !== usuario) {
    setPrevOpenForm(open);
    setPrevUsuarioForm(usuario);
    if (open) {
      setChangePassword(false);
      if (usuario) {
        reset({
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          password: '',
          passwordConfirm: '',
        });
        setAvatarPreview(usuario.avatar_url ?? null);
      } else {
        reset({
          nombre: '',
          email: '',
          rol: 'vendedor',
          password: '',
          passwordConfirm: '',
        });
        setAvatarPreview(null);
      }
    }
  }

  const rolOptions = useMemo(
    () => roles.map((r) => ({ label: r.nombre, value: r.codigo })),
    [roles],
  );

  const handlePickAvatar = async (file: File | undefined | null) => {
    if (!file) return;
    const err = validateAvatarFile(file);
    if (err) {
      showToast.error(err);
      return;
    }
    try {
      setAvatarPreview(await fileToDataUrl(file));
    } catch {
      showToast.error('No se pudo procesar la imagen');
    }
  };

  const avatarChanged =
    isEdit && avatarPreview !== (usuario?.avatar_url ?? null);

  const onSubmit = async (data: UsuarioFormInput) => {
    try {
      setIsSubmitting(true);

      if (isEdit && usuario) {
        const payload: Parameters<typeof updateUsuario>[1] = {
          nombre: data.nombre,
          email: data.email,
          rol: data.rol,
          ...(data.password ? { password: data.password as string } : {}),
        };
        if (avatarChanged) {
          payload.avatar_url = avatarPreview;
        }
        const updated = await updateUsuario(usuario.id_usuario, payload);
        if (me?.id_usuario === updated.id_usuario) {
          await refresh();
        }
        showToast.success('Usuario actualizado correctamente');
      } else {
        await createUsuario({
          nombre: data.nombre,
          email: data.email,
          password: data.password as string,
          rol: data.rol,
        });
        showToast.success('Usuario creado correctamente');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudo guardar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      maxWidth="form"
      closeDisabled={isSubmitting}
      footer={<ModalFooter><Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button><Button type="submit" form="usuario-form" variant="primary" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear usuario'}</Button></ModalFooter>}
    >
      <form id="usuario-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isEdit && (
          <div className="flex items-center gap-3 bg-surface-muted rounded-xl p-3">
            <div className="relative">
              <Avatar src={avatarPreview} nombre={usuario?.nombre} size="md" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-accent-primary text-on-accent flex items-center justify-center border-2 border-white hover:bg-accent-hover transition-colors"
                title="Cambiar foto"
                aria-label="Cambiar foto"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-subtitle truncate">{usuario?.nombre}</p>
              <p className="text-xs text-brand-options truncate">{usuario?.email}</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-accent-ink hover:underline"
                >
                  Cambiar foto
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => setAvatarPreview(null)}
                    className="text-xs font-semibold text-danger hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                void handlePickAvatar(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre"
            placeholder="Nombre completo"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <Input
            label="Correo"
            type="email"
            placeholder="correo@ejemplo.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="sm:col-span-2"><Select
            label="Rol"
            variant="modal"
            options={rolOptions}
            placeholder="Seleccionar rol"
            error={errors.rol?.message}
            {...register('rol')}
            value={watch('rol')}
          /></div>
        </div>

        <div className="border-t border-border-default pt-4">
          {isEdit && <Button type="button" variant="outline" size="sm" aria-expanded={changePassword} onClick={() => { setChangePassword(value => !value); reset({ ...watch(), password: '', passwordConfirm: '' }); }}>{changePassword ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}</Button>}
          {(!isEdit || changePassword) && <p className="text-xs font-semibold uppercase tracking-wider text-brand-options mb-3">
            {isEdit ? 'Cambiar contraseña (opcional)' : 'Contraseña'}
          </p>}
          {(!isEdit || changePassword) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isEdit ? 'Nueva contraseña' : 'Contraseña'}
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Repetir contraseña'}
              error={errors.passwordConfirm?.message}
              {...register('passwordConfirm')}
            />
          </div>}
        </div>

      </form>
    </Modal>
  );
}
