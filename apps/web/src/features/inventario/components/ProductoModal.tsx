"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, Trash2, Loader2 } from "lucide-react";
import { z } from "zod";
import { CrearProductoSchema } from "@goldcontinent/shared/schemas/productos";
import { ColorConfigModal, ColorItem } from "@/features/inventario/components/ColorConfigModal";
import { apiClient, uploadFile } from "@/lib/apiClient";
import { getImageUrl, handleImageError } from "@/lib/imageUtils";
import { Modal, Input, Select, Button, Textarea } from "@/components/ui";
import { ProductoInventario } from "@goldcontinent/shared/types/inventario";
import { toast } from "sonner";

interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
}

interface Almacen {
  id_almacen: number;
  nombre: string;
}

interface ProductoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  modo: "crear" | "editar";
  productoInicial?: ProductoInventario;
  onGuardar?: (datos: ProductoInventario) => void;
}

// Use the schema type directly, cast resolver to avoid type issues with optional fields
type ProductoFormData = z.infer<typeof CrearProductoSchema>;

export function ProductoModal({
  open,
  onClose,
  onSuccess,
  modo,
  productoInicial,
  onGuardar,
}: ProductoModalProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = modo === "editar" && !!productoInicial;
  const title = isEditing ? "Editar Producto" : "Agregar Producto";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormData>({
    resolver: zodResolver(CrearProductoSchema) as any,
    defaultValues: {
      codigo: "",
      id_categoria: 1,
      id_almacen: 1,
      tipo_flor: "",
      material: "",
      composicion: "",
      presentacion: "",
      numero_cabezas: 1,
      tamano: "",
      unidades_por_caja: 1,
      stock_principal: 0,
      stock_minimo: 10,
      descripcion: "",
      colores_surtido: ["Estándar"],
      precio_tienda_unidad: 10,
      precio_tienda_docena: 100,
      precio_tienda_caja: 800,
      precio_distribuidor_unidad: 8,
      precio_distribuidor_docena: 80,
      precio_distribuidor_caja: 650,
      costo_normal: 0,
      costo_distribuidor: 0,
    },
    mode: "onChange",
    values: (() => {
      if (!isEditing || !productoInicial) return undefined;
      const inv = productoInicial;
      // Buscar el almacén principal del producto
      const almacenPrincipal = inv.stock_actual?.[0]?.id_almacen || 1;
      return {
        codigo: inv.codigo || "",
        id_categoria: inv.id_categoria || 1,
        id_almacen: almacenPrincipal,
        tipo_flor: inv.tipo_flor || "",
        material: inv.material || "",
        composicion: inv.composicion || "",
        presentacion: inv.presentacion || "",
        numero_cabezas: inv.numero_cabezas || 1,
        tamano: inv.tamano || "",
        unidades_por_caja: inv.unidades_por_caja || 1,
        stock_principal: inv.stock_principal || 0,
        stock_minimo: inv.stock_minimo || 10,
        descripcion: inv.descripcion || "",
        colores_surtido: inv.colores_surtido || ["Estándar"],
        precio_tienda_unidad: Number(inv.precios_actuales?.precio_unidad_normal) || 10,
        precio_tienda_docena: Number(inv.precios_actuales?.precio_docena_normal) || 100,
        precio_tienda_caja: Number(inv.precios_actuales?.precio_mayor_normal) || 800,
        precio_distribuidor_unidad: Number(inv.precios_actuales?.precio_unidad_dist) || 8,
        precio_distribuidor_docena: Number(inv.precios_actuales?.precio_docena_dist) || 80,
        precio_distribuidor_caja: Number(inv.precios_actuales?.precio_mayor_dist) || 650,
        costo_normal: Number(inv.precios_actuales?.costo_normal) || 0,
        costo_distribuidor: Number(inv.precios_actuales?.costo_distribuidor) || 0,
      };
    })(),
  });

  const coloresSurtidos = watch("colores_surtido") || [];

  // Autogeneración de descripción en tiempo real - watch individual fields to avoid infinite loop
  const tipoFlor = watch("tipo_flor");
  const composicion = watch("composicion");
  const material = watch("material");
  const presentacion = watch("presentacion");
  const numeroCabezas = watch("numero_cabezas");
  const tamano = watch("tamano");
  const unidadesPorCaja = watch("unidades_por_caja");

  useEffect(() => {
    const partes = [
      composicion,
      tipoFlor ? `DE ${tipoFlor}` : null,
      material,
      presentacion,
      numeroCabezas ? `DE ${numeroCabezas} CABEZAS` : null,
      tamano,
      unidadesPorCaja && Number(unidadesPorCaja) > 1 ? `(CAJA X ${unidadesPorCaja} UNID)` : null,
    ].filter(Boolean);

    const descripcionGenerada = partes.join(" ").toUpperCase().replace(/\s+/g, " ").trim();

    if (descripcionGenerada) {
      setValue("descripcion", descripcionGenerada, { shouldValidate: true });
    }
  }, [
    tipoFlor,
    composicion,
    material,
    presentacion,
    numeroCabezas,
    tamano,
    unidadesPorCaja,
    setValue,
  ]);

  useEffect(() => {
    if (open) {
      const fetchFilters = async () => {
        try {
          const [catRes, almRes] = await Promise.all([
            apiClient("/categorias?limit=100"),
            apiClient("/almacenes?activo=true&limit=100"),
          ]);
          setCategorias(catRes.data || []);
          setAlmacenes(almRes.data || []);
        } catch (error) {
          console.error("Error fetching filters:", error);
        } finally {
          setLoadingFilters(false);
        }
      };
      fetchFilters();
    }
  }, [open]);

  useEffect(() => {
    if (isEditing && productoInicial?.foto_url) {
      setImagePreview(getImageUrl(productoInicial.foto_url, '150'));
    }
  }, [isEditing, productoInicial]);

  // Convertir colores_surtido (string[]) a ColorItem[] para el modal
  const initialColorsForModal: ColorItem[] = (coloresSurtidos as string[]).map((name) => ({
    name,
    hex: "#6b7280",
  }));

  // Convertir ColorItem[] a string[] al guardar
  const coloresSurtidosParaGuardar = coloresSurtidos as string[];

  const handleClose = () => {
    reset();
    setImageFile(null);
    setImagePreview(null);
    onClose();
  };

  const handleFormSubmit = async (data: ProductoFormData) => {
    const coloresArray = Array.isArray(data.colores_surtido)
      ? data.colores_surtido
      : ["Estándar"];

    // Determinar la URL de la foto a enviar:
    // - Si hay nuevo archivo seleccionado (imageFile), lo subiremos y obtendremos URL
    // - Si no hay archivo nuevo y estamos editando, preservar la foto existente
    // - Si es creación sin imagen, enviar null
    let fotoUrlToSend = isEditing ? productoInicial?.foto_url || null : null;

    // Si hay nuevo archivo, intentar subirlo primero
    if (imageFile) {
      let uploadedUrl: string | null = null;

try {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await uploadFile('/productos/upload', formData);
        
        // Validar explícitamente la respuesta: aceptar URLs absolutas, data URLs Y rutas relativas que inicien con /
        const rawUrl = uploadRes?.url || uploadRes?.data?.url || '';
        const isValidUrl = rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '' && 
          (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('/'));
        
        if (isValidUrl) {
          uploadedUrl = rawUrl.trim();
        } else {
          console.warn('Upload response inválida o vacía:', rawUrl);
        }
      } catch (err) {
        console.warn("Fallo endpoint de subida de imagen:", err);
      }
      
      // Si no se obtuvo una URL válida de MinIO/Backend, convertir AHORA a Base64
      if (!uploadedUrl) {
        console.log("Activando fallback local: convirtiendo imagen a Base64");
        fotoUrlToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      } else {
        fotoUrlToSend = uploadedUrl;
      }
    }

    const payload: Record<string, any> = {
      codigo: data.codigo?.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      descripcion: data.descripcion?.trim(),
      id_categoria: Number(data.id_categoria) || 1,
      id_almacen: Number(data.id_almacen) || 1,
      stock_principal: Number(data.stock_principal) || 0,
      stock_minimo: Number(data.stock_minimo) || 10,
      unidades_por_caja: Number(data.unidades_por_caja) || 1,
      colores_surtido: coloresArray,
      foto_url: fotoUrlToSend,

      precio_tienda_unidad: Number(data.precio_tienda_unidad) || 10,
      precio_tienda_docena: Number(data.precio_tienda_docena) || 100,
      precio_tienda_caja: Number(data.precio_tienda_caja) || 800,
      precio_distribuidor_unidad: Number(data.precio_distribuidor_unidad) || 8,
      precio_distribuidor_docena: Number(data.precio_distribuidor_docena) || 80,
      precio_distribuidor_caja: Number(data.precio_distribuidor_caja) || 650,
      costo_normal: Number(data.costo_normal) || 0,
      costo_distribuidor: Number(data.costo_distribuidor) || 0,
    };

    // Campos opcionales para descripción autogenerada
    if (data.tipo_flor?.trim()) payload.tipo_flor = data.tipo_flor.trim();
    if (data.material?.trim()) payload.material = data.material.trim();
    if (data.composicion?.trim()) payload.composicion = data.composicion.trim();
    if (data.presentacion?.trim()) payload.presentacion = data.presentacion.trim();
    if (data.tamano?.trim()) payload.tamano = data.tamano.trim();
    if (data.numero_cabezas) payload.numero_cabezas = Number(data.numero_cabezas);

    // Asegurar que id_producto NO vaya en el body (solo en URL para PATCH)
    // El form data no debería tener id_producto, pero por seguridad:
    // delete payload.id_producto; // No es necesario si no está en el form

    try {
      if (isEditing && productoInicial) {
        await apiClient(`/api/productos/${productoInicial.id_producto}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient("/api/productos", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (onSuccess) onSuccess();
      if (onGuardar) {
        const productoGuardado: any = { ...payload, id_producto: isEditing ? productoInicial?.id_producto : undefined };
        onGuardar(productoGuardado);
      }
      handleClose();
    } catch (error: any) {
      console.error("Error guardando producto:", error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Error al guardar el producto';
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <Modal open={open} onClose={handleClose} title={title} maxWidth="xl">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* ============================================================ */}
          {/* SECCIÓN 1: DATOS PRINCIPALES DE IDENTIFICACIÓN */}
          {/* ============================================================ */}
          <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-brand-options uppercase tracking-wider mb-3 text-amber-600 flex items-center gap-1">
              <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">1</span>
              DATOS PRINCIPALES
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="CÓDIGO *"
                placeholder="Ej: RYG18-NU02"
                error={errors.codigo?.message as string}
                {...register("codigo")}
                disabled={isEditing}
              />
              <Select
                label="CATEGORÍA *"
                error={errors.id_categoria?.message as string}
                {...register("id_categoria")}
                disabled={loadingFilters}
              >
                <option value="">Seleccione Categoría</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre_categoria}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN 2: ATRIBUTOS FÍSICOS (Fórmula de la Descripción) */}
          {/* ============================================================ */}
          <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-brand-options uppercase tracking-wider mb-3 text-amber-600 flex items-center gap-1">
              <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">2</span>
              ATRIBUTOS FÍSICOS
            </h3>
            <p className="text-[10px] text-brand-options mb-3 italic">
              Estos campos alimentan la descripción autogenerada y el algoritmo de recomendaciones.
            </p>

            {/* Fila 1: Composición, Tipo Flor, Material */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="COMPOSICIÓN *"
                placeholder="Ramo"
                error={errors.composicion?.message as string}
                {...register("composicion")}
              />
              <Input
                label="TIPO DE FLOR *"
                placeholder="Rosa"
                error={errors.tipo_flor?.message as string}
                {...register("tipo_flor")}
              />
              <Input
                label="MATERIAL"
                placeholder="Tela Premium"
                error={errors.material?.message as string}
                {...register("material")}
              />
            </div>

            {/* Fila 2: Presentación, N° Cabezas, Tamaño */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="PRESENTACIÓN"
                placeholder="Ramo"
                error={errors.presentacion?.message as string}
                {...register("presentacion")}
              />
              <Input
                label="N° DE CABEZAS *"
                type="number"
                min="1"
                placeholder="18"
                error={errors.numero_cabezas?.message as string}
                {...register("numero_cabezas", { valueAsNumber: true })}
              />
              <Input
                label="TAMAÑO"
                placeholder="35cm aprox"
                error={errors.tamano?.message as string}
                {...register("tamano")}
              />
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN 3: VARIACIONES DE COLORES */}
          {/* ============================================================ */}
          <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-brand-options uppercase tracking-wider mb-3 text-amber-600 flex items-center gap-1">
              <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">3</span>
              VARIACIONES DE COLORES (colores_surtido)
            </h3>
            <p className="text-[10px] text-brand-options mb-3 italic">
              Ingrese los colores disponibles. Se guardan como array JSON en Prisma.
            </p>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-brand-subtitle uppercase tracking-wider">
                COLORES SURTIDOS
              </label>
              <Button
                type="button"
                variant={coloresSurtidosParaGuardar.length > 0 ? "primary" : "outline"}
                onClick={() => setIsColorModalOpen(true)}
                className="w-full text-xs"
              >
                Configurar {coloresSurtidosParaGuardar.length > 0 && `(${coloresSurtidosParaGuardar.length})`}
              </Button>
              {coloresSurtidosParaGuardar.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {coloresSurtidosParaGuardar.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-200 rounded text-xs text-amber-800"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN 4: INVENTARIO Y LOGÍSTICA */}
          {/* ============================================================ */}
          <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-brand-options uppercase tracking-wider mb-3 text-amber-600 flex items-center gap-1">
              <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">4</span>
              INVENTARIO Y LOGÍSTICA
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                label="ALMACÉN DESTINO *"
                error={errors.id_almacen?.message as string}
                {...register("id_almacen", { valueAsNumber: true })}
                disabled={loadingFilters}
              >
                <option value="">Seleccione Almacén</option>
                {almacenes.map((a) => (
                  <option key={a.id_almacen} value={a.id_almacen}>
                    {a.nombre}
                  </option>
                ))}
              </Select>
              <Input
                label="UNIDADES POR CAJA *"
                type="number"
                min="1"
                placeholder="12"
                error={errors.unidades_por_caja?.message as string}
                {...register("unidades_por_caja", { valueAsNumber: true })}
              />
              <Input
                label="STOCK PRINCIPAL *"
                type="number"
                min="0"
                placeholder="0"
                error={errors.stock_principal?.message as string}
                {...register("stock_principal", { valueAsNumber: true })}
              />
              <Input
                label="STOCK MÍNIMO *"
                type="number"
                min="0"
                placeholder="10"
                error={errors.stock_minimo?.message as string}
                {...register("stock_minimo", { valueAsNumber: true })}
              />
            </div>
            <p className="text-[10px] text-brand-options mt-2 italic">
              Stock Total es calculado por el backend. Stock Mínimo dispara alertas.
            </p>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN 5: DESCRIPCIÓN AUTOGENERADA Y EDITABLE */}
          {/* ============================================================ */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-bold text-brand-options uppercase tracking-wider text-amber-600 flex items-center gap-1">
                <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">5</span>
                DESCRIPCIÓN
              </h3>
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">AUTOGENERADA</span>
            </div>
            <p className="text-[10px] text-amber-700/80 mb-2 italic">
              Esta descripción se guarda formateada para recomendaciones y búsquedas inteligentes.
            </p>
            <Textarea
              label=""
              placeholder="Se autogenera: COMPOSICIÓN DE TIPO_FLOR MATERIAL PRESENTACIÓN DE N° CABEZAS TAMAÑO (CAJA X UNID)"
              error={errors.descripcion?.message as string}
              rows={3}
              {...register("descripcion")}
            />
            <p className="text-[10px] text-amber-600 mt-1">
              ✏️ Puede editar manualmente. La autogeneración se reactiva al cambiar atributos físicos.
            </p>
          </div>

          {/* ============================================================ */}
          {/* MATRIZ DE PRECIOS */}
          {/* ============================================================ */}
          <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-brand-options uppercase tracking-wider mb-3 text-amber-600 flex items-center gap-1">
              <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">$</span>
              MATRIZ DE PRECIOS
            </h3>
            <div className="overflow-x-auto">
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
                        min="0"
                        placeholder="S/ 8.50"
                        className="w-full text-center bg-transparent text-blue-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-blue-400"
                        {...register("precio_tienda_unidad", { valueAsNumber: true })}
                      />
                    </td>
                    <td className="p-1 bg-amber-50/40">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="S/ 8.50"
                        className="w-full text-center bg-transparent text-amber-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-amber-400"
                        {...register("precio_distribuidor_unidad", { valueAsNumber: true })}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-brand-subtitle">DOCENA</td>
                    <td className="p-1 bg-blue-50/40">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="S/ 85.00"
                        className="w-full text-center bg-transparent text-blue-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-blue-400"
                        {...register("precio_tienda_docena", { valueAsNumber: true })}
                      />
                    </td>
                    <td className="p-1 bg-amber-50/40">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="S/ 80.00"
                        className="w-full text-center bg-transparent text-amber-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-amber-400"
                        {...register("precio_distribuidor_docena", { valueAsNumber: true })}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-brand-subtitle">CAJA</td>
                    <td className="p-1 bg-blue-50/40">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="S/ 650.00"
                        className="w-full text-center bg-transparent text-blue-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-blue-400"
                        {...register("precio_tienda_caja", { valueAsNumber: true })}
                      />
                    </td>
                    <td className="p-1 bg-amber-50/40">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="S/ 600.00"
                        className="w-full text-center bg-transparent text-amber-900 font-medium outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-amber-400"
                        {...register("precio_distribuidor_caja", { valueAsNumber: true })}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ÁREA DE IMAGEN */}
          {/* ============================================================ */}
          <div
            className={`
              relative flex flex-col items-center justify-center
              ${imagePreview ? "h-40" : "h-20"}
              border-2 border-dashed border-gray-300 rounded-xl
              text-center hover:border-brand-primary transition-colors cursor-pointer
              bg-gray-50/50 relative overflow-hidden
            `}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (!file.type.startsWith("image/")) return;
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }
            }}
            onClick={() => !imagePreview && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  if (!file.type.startsWith("image/")) return;
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
              accept="image/*"
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                  onError={(e) => handleImageError(e, '150')}
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Eliminar imagen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-brand-options">
                <CloudUpload className="w-5 h-5" />
                <span className="text-xs font-medium">Arrastra o selecciona la imagen del producto</span>
              </div>
            )}
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Producto"}
            </Button>
          </div>
        </form>
      </Modal>

      <ColorConfigModal
        open={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        initialColors={initialColorsForModal}
        onSave={(colors) => {
          setValue("colores_surtido", colors.map((c) => c.name), { shouldValidate: true });
        }}
      />
    </>
  );
}