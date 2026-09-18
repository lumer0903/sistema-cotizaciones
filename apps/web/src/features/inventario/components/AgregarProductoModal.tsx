'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CloudUpload } from 'lucide-react';
import { z } from 'zod';
import { CrearProductoSchema } from '@goldcontinent/shared/schemas/productos';
import { ColorConfigModal, ColorItem } from '@/features/inventario/components/ColorConfigModal';
import { apiClient } from '@/lib/apiClient';
import { Modal, Input, Select, Button } from '@/components/ui';

type CrearProductoFormInput = z.input<typeof CrearProductoSchema> & {
  colores_surtido?: ColorItem[] | any;
  ubicacion?: string;
};

interface AgregarProductoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
}

interface Almacen {
  id_almacen: number;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  activo: boolean;
}

export function AgregarProductoModal({ open, onClose, onSuccess }: AgregarProductoModalProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CrearProductoFormInput>({
    resolver: zodResolver(CrearProductoSchema),
    defaultValues: {
      stock_tacna: 0,
      costo_normal: 0,
      costo_distribuidor: 0,
      colores_surtido: ['Estándar'],
    },
    mode: 'onChange',
  });

  const coloresSurtidos = watch('colores_surtido') || [];

  useEffect(() => {
    if (open) {
      const fetchFilters = async () => {
        try {
          const [catRes, almRes] = await Promise.all([
            apiClient('/categorias?limit=100'),
            apiClient('/almacenes?activo=true&limit=100'),
          ]);
          setCategorias(catRes.data || []);
          setAlmacenes(almRes.data || []);
        } catch (error) {
          console.error('Error fetching filters:', error);
        } finally {
          setLoadingFilters(false);
        }
      };
      fetchFilters();
    }
  }, [open]);

  const handleClose = () => {
    reset();
    setImageFile(null);
    setImagePreview(null);
    onClose();
  };

  const handleFormSubmit = async (data: any) => {
    const partesDescripcion = [
      data.tipo_flor?.trim(),
      data.material?.trim() ? `de ${data.material.trim()}` : null,
      data.presentacion?.trim(),
      data.numero_cabezas ? `de ${data.numero_cabezas} cabezas` : null,
      data.composicion?.trim(),
      data.tamano?.trim() ? `tamaño ${data.tamano.trim()}` : null,
    ].filter(Boolean);

    let descripcionFinal = data.descripcion?.trim() || partesDescripcion.join(', ');
    if (!descripcionFinal || descripcionFinal.length < 5) {
      descripcionFinal = `${data.codigo || 'PRD'} - Producto sin descripción detallada`;
    }

    const id_almacen = data.ubicacion === 'TACNA' ? 2 : 1;

    const payload: Record<string, any> = {
      codigo: data.codigo?.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      descripcion: descripcionFinal,
      id_categoria: Number(data.id_categoria) || 1,
      id_almacen,
      stock_principal: id_almacen === 1 ? Number(data.stock_principal) || 0 : 0,
      stock_tacna: id_almacen === 2 ? Number(data.stock_principal) || 0 : 0,
      stock_minimo: Number(data.stock_minimo) || 10,
      unidades_por_caja: Number(data.unidades_por_caja) || 1,
      colores_surtido:
        Array.isArray(data.colores_surtido) && data.colores_surtido.length > 0
          ? data.colores_surtido
          : ['Estándar'],

      precio_tienda_unidad: Number(data.precio_tienda_unidad) || 10,
      precio_tienda_docena: Number(data.precio_tienda_docena) || 100,
      precio_tienda_caja: Number(data.precio_tienda_caja) || 800,
      precio_distribuidor_unidad: Number(data.precio_distribuidor_unidad) || 8,
      precio_distribuidor_docena: Number(data.precio_distribuidor_docena) || 80,
      precio_distribuidor_caja: Number(data.precio_distribuidor_caja) || 650,
    };

    if (data.tipo_flor?.trim()) payload.tipo_flor = data.tipo_flor.trim();
    if (data.material?.trim()) payload.material = data.material.trim();
    if (data.composicion?.trim()) payload.composicion = data.composicion.trim();
    if (data.presentacion?.trim()) payload.presentacion = data.presentacion.trim();
    if (data.tamano?.trim()) payload.tamano = data.tamano.trim();
    if (data.numero_cabezas) payload.numero_cabezas = Number(data.numero_cabezas);

    await apiClient('/api/productos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (onSuccess) {
      onSuccess();
    }
    handleClose();
  };

  const openColorModal = () => setIsColorModalOpen(true);

  const [presentacion, tipoFlor, material, numeroCabezas, tamano] = watch([
    'presentacion',
    'tipo_flor',
    'material',
    'numero_cabezas',
    'tamano',
  ]);

  useEffect(() => {
    const parts = [
      tipoFlor && `${tipoFlor}`,
      material && `de ${material}`,
      presentacion && `${presentacion}`,
      numeroCabezas && `de ${numeroCabezas} cabezas`,
      tamano && `tamaño ${tamano}`,
    ].filter(Boolean);

    const autogen = parts.join(', ');
    setValue('descripcion', autogen, { shouldValidate: !!autogen });
  }, [presentacion, tipoFlor, material, numeroCabezas, tamano, setValue]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Agregar Producto" maxWidth="lg">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* CÓDIGO */}
          <div>
            <Input
              label="CÓDIGO"
              placeholder="Ej: PRU-EBA"
              error={errors.codigo?.message as string}
              {...register('codigo')}
            />
          </div>

          {/* CATEGORÍA, TIPO DE FLOR, MATERIAL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="CATEGORÍA"
              error={errors.id_categoria?.message as string}
              {...register('id_categoria')}
            >
              <option value="">Seleccione Categoría</option>
              {categorias.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nombre_categoria}
                </option>
              ))}
            </Select>

            <Input
              label="TIPO DE FLOR"
              placeholder="Rosas"
              error={errors.tipo_flor?.message as string}
              {...register('tipo_flor')}
            />

            <Input
              label="MATERIAL"
              placeholder="Seda"
              error={errors.material?.message as string}
              {...register('material')}
            />
          </div>

          {/* COMPOSICIÓN, PRESENTACIÓN, N° CABEZAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="COMPOSICIÓN"
              placeholder="Follaje"
              error={errors.composicion?.message as string}
              {...register('composicion')}
            />

            <Input
              label="PRESENTACIÓN"
              placeholder="Ramo"
              error={errors.presentacion?.message as string}
              {...register('presentacion')}
            />

            <Input
              label="N° DE CABEZAS"
              type="number"
              placeholder="10"
              error={errors.numero_cabezas?.message as string}
              {...register('numero_cabezas', { valueAsNumber: true })}
            />
          </div>

          {/* TAMAÑO, UBICACIÓN, UNID POR CAJA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="TAMAÑO"
              placeholder="10X20"
              error={errors.tamano?.message as string}
              {...register('tamano')}
            />

            <Select label="UBICACIÓN" {...register('ubicacion')}>
              <option value="">Seleccione Almacén</option>
              {almacenes.map((a) => (
                <option key={a.id_almacen} value={a.id_almacen}>
                  {a.nombre}
                </option>
              ))}
            </Select>

            <Input
              label="UNID. POR CAJA"
              type="number"
              placeholder="20"
              error={errors.unidades_por_caja?.message as string}
              {...register('unidades_por_caja', { valueAsNumber: true })}
            />
          </div>

          {/* STOCK TOTAL, STOCK MÍNIMO, COLOR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <Input
              label="STOCK TOTAL"
              type="number"
              placeholder="1000"
              error={errors.stock_principal?.message as string}
              {...register('stock_principal', { valueAsNumber: true })}
            />

            <Input
              label="STOCK MÍNIMO"
              type="number"
              placeholder="20"
              error={errors.stock_minimo?.message as string}
              {...register('stock_minimo', { valueAsNumber: true })}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-brand-subtitle uppercase tracking-wider">
                COLORES SURTIDOS
              </label>
              <Button
                type="button"
                variant={coloresSurtidos.length > 0 ? 'primary' : 'outline'}
                onClick={openColorModal}
                className="w-full text-xs"
              >
                Configurar {coloresSurtidos.length > 0 && `(${coloresSurtidos.length})`}
              </Button>
            </div>
          </div>

          {/* DESCRIPCIÓN AUTOGENERADA */}
          <div>
            <Input
              label="DESCRIPCIÓN (AUTOGENERADA)"
              placeholder="Rosa de seda, ramo de 10 cabezas, follaje..."
              disabled
              readOnly
              {...register('descripcion')}
            />
          </div>

          {/* MATRIZ DE PRECIOS */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mt-2 shadow-sm">
            <table className="w-full text-xs text-center">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-brand-subtitle uppercase">
                  <th className="py-2.5 px-2">UNIDAD DE MEDIDA</th>
                  <th className="py-2.5 px-2 text-blue-700">PRECIO TIENDA (S/)</th>
                  <th className="py-2.5 px-2 text-amber-700">DISTRIBUIDOR (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 px-2 font-bold text-brand-subtitle">UNIDAD</td>
                  <td className="p-1 bg-blue-50/40">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="S/ 8.50"
                      className="w-full text-center bg-transparent text-blue-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-blue-400"
                      {...register('precio_tienda_unidad', { valueAsNumber: true })}
                    />
                  </td>
                  <td className="p-1 bg-amber-50/40">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="S/ 8.50"
                      className="w-full text-center bg-transparent text-amber-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-amber-400"
                      {...register('precio_distribuidor_unidad', { valueAsNumber: true })}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-bold text-brand-subtitle">DOCENA</td>
                  <td className="p-1 bg-blue-50/40">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="S/ 85.00"
                      className="w-full text-center bg-transparent text-blue-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-blue-400"
                      {...register('precio_tienda_docena', { valueAsNumber: true })}
                    />
                  </td>
                  <td className="p-1 bg-amber-50/40">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="S/ 80.00"
                      className="w-full text-center bg-transparent text-amber-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-amber-400"
                      {...register('precio_distribuidor_docena', { valueAsNumber: true })}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-bold text-brand-subtitle">CAJA</td>
                  <td className="p-1 bg-blue-50/40">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="S/ 650.00"
                      className="w-full text-center bg-transparent text-blue-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-blue-400"
                      {...register('precio_tienda_caja', { valueAsNumber: true })}
                    />
                  </td>
                  <td className="p-1 bg-amber-50/40">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="S/ 600.00"
                      className="w-full text-center bg-transparent text-amber-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-amber-400"
                      {...register('precio_distribuidor_caja', { valueAsNumber: true })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ÁREA DE IMAGEN */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center hover:border-brand-primary transition-colors cursor-pointer bg-gray-50/50 flex flex-col items-center justify-center relative overflow-hidden h-20"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-full object-contain py-1" />
            ) : (
              <div className="flex items-center gap-2 text-brand-options">
                <CloudUpload className="w-5 h-5" />
                <span className="text-xs font-medium">Arrastra o selecciona la imagen del producto</span>
              </div>
            )}
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Guardar Producto
            </Button>
          </div>
        </form>
      </Modal>

      <ColorConfigModal
        open={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        initialColors={coloresSurtidos}
        onSave={(colors) => {
          setValue('colores_surtido', colors, { shouldValidate: true });
        }}
      />
    </>
  );
}
