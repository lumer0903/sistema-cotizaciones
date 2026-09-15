'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CloudUpload } from 'lucide-react';
import { z } from 'zod';
import { CrearProductoSchema } from '@goldcontinent/shared/schemas/productos';
import { ColorConfigModal, ColorItem } from '@/components/ui/ColorConfigModal';
import { apiClient } from '@/lib/apiClient';

// Extendemos el schema temporalmente
type CrearProductoFormInput = z.input<typeof CrearProductoSchema> & {
  colores_surtido?: ColorItem[] | any;
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
    formState: { errors, isValid, isSubmitting },
  } = useForm<CrearProductoFormInput>({
    resolver: zodResolver(CrearProductoSchema),
    defaultValues: {
      stock_tacna: 0,
      costo_normal: 0,
      costo_distribuidor: 0,
      colores_surtido: [],
    },
    mode: 'onChange',
  });

  const coloresSurtidos = watch('colores_surtido') || [];

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
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
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleClose = () => {
    reset();
    setImageFile(null);
    setImagePreview(null);
    onClose();
  };

  const onSubmit = async (data: CrearProductoFormInput) => {
    try {
      console.log('Submitting data:', data);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating product:', error);
    }
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
      const file = e.dataTransfer.files[0];
      handleFile(file);
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

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-2"
        role="dialog"
      >
        <div className="bg-white rounded-xl w-full max-w-[550px] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-800">Agregar Producto</h2>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            <div className="space-y-3">
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  CODIGO
                </label>
                <input
                  {...register('codigo')}
                  placeholder="Ej: PRU-EBA"
                  className="w-full h-8 px-3 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    CATEGORIA
                  </label>
                  <select
                    {...register('id_categoria')}
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500 appearance-none bg-white"
                  >
                    <option value="">Adorno</option>
                    {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    TIPO DE FLOR
                  </label>
                  <input
                    {...register('tipo_flor')}
                    placeholder="Rosas"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    MATERIAL
                  </label>
                  <input
                    {...register('material')}
                    placeholder="Seda"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    COMPOSICIÓN
                  </label>
                  <input
                    {...register('composicion')}
                    placeholder="Follaje"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    PRESENTACIÓN
                  </label>
                  <input
                    {...register('presentacion')}
                    placeholder="Ramo"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    N° DE CABEZAS
                  </label>
                  <input
                    type="number"
                    {...register('numero_cabezas', { valueAsNumber: true })}
                    placeholder="10"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    TAMAÑO
                  </label>
                  <input
                    {...register('tamano')}
                    placeholder="10X20"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    UBICACIÓN
                  </label>
                  <select
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500 appearance-none bg-white"
                  >
                    <option value="">Estante B</option>
                    {almacenes.map((a) => <option key={a.id_almacen} value={a.id_almacen}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    UNID. POR CAJA
                  </label>
                  <input
                    type="number"
                    {...register('unidades_por_caja', { valueAsNumber: true })}
                    placeholder="20"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    STOCK TOTAL
                  </label>
                  <input
                    type="number"
                    {...register('stock_principal', { valueAsNumber: true })}
                    placeholder="1000"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    STOCK MINIMO
                  </label>
                  <input
                    type="number"
                    {...register('stock_minimo', { valueAsNumber: true })}
                    placeholder="20"
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    COLOR
                  </label>
                  <button
                    type="button"
                    onClick={openColorModal}
                    className={`w-full h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      coloresSurtidos.length > 0
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 border border-transparent'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400 border border-gray-400'
                    }`}
                  >
                    Configurar {coloresSurtidos.length > 0 && `(${coloresSurtidos.length})`}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  DESCRIPCIÓN (AUTOGENERADA)
                </label>
                <input
                  {...register('descripcion')}
                  placeholder="Rosa de seda, ramo de 10 cabezas, follaje, tamaño 10x10."
                  className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none bg-gray-50/50 text-gray-600 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden mt-1">
                <table className="w-full text-[10px] text-center">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-2 px-1 font-bold text-amber-500">UNIDAD DE MEDIDA</th>
                      <th className="py-2 px-1 font-bold text-[#1a56db]">PRECIO TIENDA (S/)</th>
                      <th className="py-2 px-1 font-bold text-[#b45309]">DISTRIBUIDOR (S/)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-1 px-1 font-bold text-amber-500">UNIDAD</td>
                      <td className="p-0 bg-blue-50/50">
                        <input
                          type="number"
                          step="0.01"
                          {...register('precio_tienda_unidad', { valueAsNumber: true })}
                          placeholder="S/8.50"
                          className="w-full h-7 px-1 text-center text-[#1a56db] bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="p-0 bg-orange-50/50">
                        <input
                          type="number"
                          step="0.01"
                          {...register('precio_distribuidor_unidad', { valueAsNumber: true })}
                          placeholder="S/8.50"
                          className="w-full h-7 px-1 text-center text-[#b45309] bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-orange-400"
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1 px-1 font-bold text-amber-500">DOCENA</td>
                      <td className="p-0 bg-blue-50/50">
                        <input
                          type="number"
                          step="0.01"
                          {...register('precio_tienda_docena', { valueAsNumber: true })}
                          placeholder="S/8.50"
                          className="w-full h-7 px-1 text-center text-[#1a56db] bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="p-0 bg-orange-50/50">
                        <input
                          type="number"
                          step="0.01"
                          {...register('precio_distribuidor_docena', { valueAsNumber: true })}
                          placeholder="S/8.50"
                          className="w-full h-7 px-1 text-center text-[#b45309] bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-orange-400"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 px-1 font-bold text-amber-500">CAJA</td>
                      <td className="p-0 bg-blue-50/50">
                        <input
                          type="number"
                          step="0.01"
                          {...register('precio_tienda_caja', { valueAsNumber: true })}
                          placeholder="S/8.50"
                          className="w-full h-7 px-1 text-center text-[#1a56db] bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="p-0 bg-orange-50/50">
                        <input
                          type="number"
                          step="0.01"
                          {...register('precio_distribuidor_caja', { valueAsNumber: true })}
                          placeholder="S/8.50"
                          className="w-full h-7 px-1 text-center text-[#b45309] bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-orange-400"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center hover:border-amber-400 transition-colors cursor-pointer bg-white flex flex-col items-center justify-center relative overflow-hidden h-16 mt-1"
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
                  <img src={imagePreview} alt="Preview" className="h-full object-contain absolute inset-0 mx-auto py-1" />
                ) : (
                  <div className="flex items-center gap-2 text-gray-400">
                    <CloudUpload className="w-5 h-5 text-gray-300" />
                    <span className="text-[11px] font-medium text-gray-400">Arrastra o selecciona la imagen</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 shrink-0 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 shadow-sm transition-colors disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>

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
