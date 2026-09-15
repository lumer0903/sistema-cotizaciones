'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Tag, 
  Plus, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
import { CrearProductoSchema } from '@goldcontinent/shared/schemas/productos';
import { ColorConfigModal } from '@/components/ui/ColorConfigModal';

type CrearProductoFormInput = z.input<typeof CrearProductoSchema>;
type CrearProductoFormOutput = z.output<typeof CrearProductoSchema>;
type FormFieldName = keyof CrearProductoFormInput;

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

const PRECIOS_LABELS = [
  { key: 'unidad', label: 'Unidad', tienda: 'precio_tienda_unidad' as FormFieldName, distribuidor: 'precio_distribuidor_unidad' as FormFieldName },
  { key: 'docena', label: 'Docena', tienda: 'precio_tienda_docena' as FormFieldName, distribuidor: 'precio_distribuidor_docena' as FormFieldName },
  { key: 'caja', label: 'Caja', tienda: 'precio_tienda_caja' as FormFieldName, distribuidor: 'precio_distribuidor_caja' as FormFieldName },
] as const;

export default function CrearProductoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, dirtyFields },
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

  // Cargar categorías y almacenes
  useEffect(() => {
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
  }, []);

  // Auto-generar descripción en tiempo real
  const [presentacion, tipoFlor, material, numeroCabezas, tamano] = watch([
    'presentacion',
    'tipo_flor',
    'material',
    'numero_cabezas',
    'tamano',
  ]);

  useEffect(() => {
    if (presentacion || tipoFlor || material || numeroCabezas || tamano) {
      const desc = `${presentacion || ''} ${tipoFlor || ''} ${material || ''} x ${numeroCabezas || ''} (${tamano || ''})`.trim();
      setValue('descripcion', desc, { shouldValidate: true, shouldDirty: true });
    }
  }, [presentacion, tipoFlor, material, numeroCabezas, tamano, setValue]);

  // Watch colores_surtido para preview
  const coloresSurtido = watch('colores_surtido');

  const handleColorModalSave = (colors: string[]) => {
    setValue('colores_surtido', colors, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (data: CrearProductoFormInput) => {
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await apiClient('/productos', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (response.success && response.data) {
        router.push('/admin/productos');
        router.refresh();
      }
    } catch (error: any) {
      setSubmitError(error.message || 'Error al crear el producto');
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldError = (name: FormFieldName): string | undefined => {
    const error = errors[name as keyof typeof errors];
    return error?.message;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/productos"
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800 tracking-wide">Nuevo Producto</h1>
                <p className="text-xs text-gray-500">Complete todos los campos obligatorios</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href="/admin/productos"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                form="crear-producto-form"
                disabled={submitting || !isValid || loadingFilters}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#f8b602] rounded-lg hover:bg-[#e0a400] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                <span>GUARDAR PRODUCTO</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* FORMULARIO */}
      <form id="crear-producto-form" onSubmit={handleSubmit(onSubmit)} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {submitError && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              Información Básica
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* CÓDIGO */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  CÓDIGO <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('codigo')}
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.codigo ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: PROD001"
                  maxLength={50}
                />
                {errors.codigo && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.codigo.message}
                  </p>
                )}
              </div>

              {/* CATEGORÍA */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  CATEGORÍA <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    {...register('id_categoria')}
                    disabled={loadingFilters}
                    className={`w-full h-10 px-3 text-sm border rounded-lg outline-none appearance-none bg-white pr-10 text-gray-600 cursor-pointer ${
                      errors.id_categoria ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    } disabled:opacity-50`}
                  >
                    <option value="">Seleccione categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.id_categoria} value={cat.id_categoria.toString()}>
                        {cat.nombre_categoria}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.id_categoria && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.id_categoria.message}
                  </p>
                )}
              </div>

              {/* TIPO DE FLOR */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  TIPO DE FLOR <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('tipo_flor')}
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.tipo_flor ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Rosa, Girasol, Lirio"
                />
                {errors.tipo_flor && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.tipo_flor.message}
                  </p>
                )}
              </div>

              {/* MATERIAL */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  MATERIAL <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('material')}
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.material ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Seda, Tela, Plástico, Natural"
                />
                {errors.material && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.material.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* COMPOSICIÓN */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  COMPOSICIÓN <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('composicion')}
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.composicion ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Natural, Artificial, Mixta"
                />
                {errors.composicion && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.composicion.message}
                  </p>
                )}
              </div>

              {/* PRESENTACIÓN */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  PRESENTACIÓN <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('presentacion')}
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.presentacion ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Ramo, Caja, Unidad, Docena"
                />
                {errors.presentacion && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.presentacion.message}
                  </p>
                )}
              </div>

              {/* N° CABEZAS */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  N° CABEZAS <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('numero_cabezas', { valueAsNumber: true })}
                  min="1"
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.numero_cabezas ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 10"
                />
                {errors.numero_cabezas && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.numero_cabezas.message}
                  </p>
                )}
              </div>

              {/* TAMAÑO */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  TAMAÑO <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('tamano')}
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.tamano ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 10x20, 15x15, Ø30"
                />
                {errors.tamano && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.tamano.message}
                  </p>
                )}
              </div>
            </div>

            {/* AUTO-DESCRIPCIÓN PREVIEW */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-2">
                <CheckCircle className="w-4 h-4" />
                Descripción Auto-generada (Solo Lectura)
              </div>
              <input
                type="text"
                value={watch('descripcion') || 'Complete los campos arriba para generar la descripción'}
                readOnly
                className="w-full h-10 px-3 text-sm bg-white border border-amber-300 rounded-lg text-gray-700 font-mono text-xs"
              />
              <p className="mt-2 text-xs text-amber-700">
                Formato: [PRESENTACIÓN] [TIPO FLOR] [MATERIAL] x [N° CABEZAS] ([TAMAÑO])
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: CONFIGURACIÓN DE COLORES */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              Configuración de Colores (Surtido)
            </h2>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Los productos se reciben en presentación surtida (caja mixta). Configure los colores que componen la mezcla para referencia del vendedor.
            </p>
            
            <button
              type="button"
              onClick={() => setShowColorModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-amber-300 rounded-lg text-amber-700 font-medium text-sm hover:bg-amber-50 transition-colors"
            >
              <Tag className="w-4 h-4" />
              <span>CONFIGURAR COLORES</span>
            </button>

            {coloresSurtido.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {coloresSurtido.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium"
                  >
                    {color}
                  </span>
                ))}
              </div>
            )}

            {errors.colores_surtido && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <X className="w-3 h-3" /> {errors.colores_surtido.message}
              </p>
            )}
          </div>
        </section>

        {/* SECCIÓN 3: STOCK Y UBICACIÓN */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              Stock y Ubicación
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* STOCK PRINCIPAL */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  STOCK PRINCIPAL <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('stock_principal', { valueAsNumber: true })}
                  min="0"
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.stock_principal ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 100"
                />
                {errors.stock_principal && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.stock_principal.message}
                  </p>
                )}
              </div>

              {/* STOCK MÍNIMO */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  STOCK MÍNIMO <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('stock_minimo', { valueAsNumber: true })}
                  min="0"
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.stock_minimo ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 10"
                />
                {errors.stock_minimo && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.stock_minimo.message}
                  </p>
                )}
              </div>

              {/* ALMACÉN */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  ALMACÉN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    {...register('id_almacen')}
                    disabled={loadingFilters}
                    className={`w-full h-10 px-3 text-sm border rounded-lg outline-none appearance-none bg-white pr-10 text-gray-600 cursor-pointer ${
                      errors.id_almacen ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    } disabled:opacity-50`}
                  >
                    <option value="">Seleccione almacén</option>
                    {almacenes.map((alm) => (
                      <option key={alm.id_almacen} value={alm.id_almacen.toString()}>
                        {alm.nombre} {alm.ubicacion ? `(${alm.ubicacion})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.id_almacen && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.id_almacen.message}
                  </p>
                )}
              </div>

              {/* UNIDADES POR CAJA */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  UNIDADES POR CAJA <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('unidades_por_caja', { valueAsNumber: true })}
                  min="1"
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.unidades_por_caja ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 12"
                />
                {errors.unidades_por_caja && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.unidades_por_caja.message}
                  </p>
                )}
              </div>
            </div>

            {/* STOCK TACNA (Hidden/Informativo) */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <X className="w-4 h-4 text-gray-400" />
                <span>Stock Tacna: <strong>0 (Sede inactiva - Valor fijo)</strong></span>
              </div>
              <input type="hidden" {...register('stock_tacna')} />
            </div>
          </div>
        </section>

        {/* SECCIÓN 4: TARIFAS (GRID 2x3) */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              Tarifas de Venta
            </h2>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">TIPO VENTA</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider text-amber-700">TIENDA (NORMAL)</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider text-blue-700">DISTRIBUIDOR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {PRECIOS_LABELS.map(({ key, label, tienda, distribuidor }) => (
                    <tr key={key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-800 whitespace-nowrap">
                        {label}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          {...register(tienda, { valueAsNumber: true })}
                          className={`w-28 h-9 px-2 text-sm text-center border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                            errors[tienda] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                        />
                        {errors[tienda] && (
                          <p className="mt-1 text-xs text-red-500 text-center flex justify-center gap-1">
                            <X className="w-3 h-3" /> {errors[tienda]?.message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          {...register(distribuidor, { valueAsNumber: true })}
                          className={`w-28 h-9 px-2 text-sm text-center border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            errors[distribuidor] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                        />
                        {errors[distribuidor] && (
                          <p className="mt-1 text-xs text-red-500 text-center flex justify-center gap-1">
                            <X className="w-3 h-3" /> {errors[distribuidor]?.message}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <p className="mt-4 text-xs text-gray-500 text-center">
              <strong>Nota:</strong> "Caja" se mapea internamente a precio "Mayor" en base de datos.
            </p>
          </div>
        </section>

        {/* SECCIÓN 5: COSTOS (OPCIONAL) */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              Costos (Opcional)
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <p className="text-sm text-gray-600">
              Si no se registran costos, se completan automáticamente con 0.00.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  COSTO NORMAL
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('costo_normal', { valueAsNumber: true })}
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.costo_normal ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  COSTO DISTRIBUIDOR
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('costo_distribuidor', { valueAsNumber: true })}
                  className={`w-full h-10 px-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.costo_distribuidor ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </section>

        {/* BOTONES FINALES */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <Link
            href="/admin/productos"
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting || !isValid || loadingFilters}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#f8b602] rounded-lg hover:bg-[#e0a400] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            <span>GUARDAR PRODUCTO</span>
          </button>
        </div>
      </form>

      {/* MODAL COLORES */}
      <ColorConfigModal
        open={showColorModal}
        onClose={() => setShowColorModal(false)}
        onSave={handleColorModalSave}
        initialColors={coloresSurtido}
      />
    </div>
  );
}

// Icono ChevronDown inline para evitar importación extra
function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}