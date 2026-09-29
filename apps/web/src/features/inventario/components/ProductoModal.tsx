"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, Trash2 } from "lucide-react";
import { z } from "zod";
import { CrearProductoSchema } from "@goldcontinent/shared/schemas/productos";
import { generarDescripcionProducto } from "@goldcontinent/shared/constants/descripcion";
import { ColorConfigModal, ColorItem, resolveColorHex } from "@/features/inventario/components/ColorConfigModal";
import { apiClient, uploadFile } from "@/lib/apiClient";
import { getImageUrl, handleImageError } from "@/lib/imageUtils";
import {
  Modal,
  Input,
  Select,
  Button,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui";
import { ProductoInventario } from "@goldcontinent/shared/types/inventario";
import { toast } from "sonner";
import { showToast } from "@/lib/toast";
import { obtenerPreciosEstandarizados } from "@/lib/formatters";

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
  categorias?: Categoria[];
  almacenes?: Almacen[];
}

type ProductoFormData = z.infer<typeof CrearProductoSchema>;

const DEFAULT_FORM_VALUES = {
  codigo: "",
  id_categoria: 1,
  id_almacen: 1,
  tipo_flor: "",
  material: "",
  composicion: "",
  presentacion: "",
  follaje: "",
  numero_cabezas: undefined,
  tamano: "",
  unidades_por_caja: 1,
  stock_principal: 0,
  stock_minimo: 10,
  descripcion: "",
  colores_surtido: [],
  precio_tienda_unidad: undefined,
  precio_tienda_docena: undefined,
  precio_tienda_caja: undefined,
  precio_distribuidor_unidad: undefined,
  precio_distribuidor_docena: undefined,
  precio_distribuidor_caja: undefined,
  costo_normal: 0,
  costo_distribuidor: 0,
};

export function ProductoModal({
  open,
  onClose,
  onSuccess,
  modo,
  productoInicial,
  onGuardar,
  categorias: categoriasProp,
  almacenes: almacenesProp,
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
    defaultValues: DEFAULT_FORM_VALUES as any,
    mode: "onChange",
    values: (() => {
      if (!isEditing || !productoInicial) return undefined;
      const inv = productoInicial as any;
      const almacenPrincipal = inv.stock_actual?.[0]?.id_almacen || 1;
      const { tienda, distribuidor } = obtenerPreciosEstandarizados(inv);
      const costoNormal = Number(inv.precios_actuales?.costo_normal ?? inv.precios?.costo_normal ?? inv.costo_normal ?? 0);
      const costoDist = Number(inv.precios_actuales?.costo_distribuidor ?? inv.precios?.costo_distribuidor ?? inv.costo_distribuidor ?? 0);
      return {
        codigo: inv.codigo || "",
        id_categoria: inv.id_categoria || 1,
        id_almacen: almacenPrincipal,
        tipo_flor: inv.tipo_flor || "",
        material: inv.material || "",
        composicion: inv.composicion || "",
        presentacion: inv.presentacion || "",
        follaje: inv.follaje || "",
        numero_cabezas: inv.numero_cabezas ?? undefined,
        tamano: inv.tamano || "",
        unidades_por_caja: inv.unidades_por_caja || 1,
        stock_principal: inv.stock_principal || 0,
        stock_minimo: inv.stock_minimo || 10,
        descripcion: inv.descripcion || "",
        colores_surtido: inv.colores_surtido || [],
        precio_tienda_unidad: Number(tienda.unidad) || undefined,
        precio_tienda_docena: Number(tienda.docena) || undefined,
        precio_tienda_caja: Number(tienda.mayor) || undefined,
        precio_distribuidor_unidad: Number(distribuidor.unidad) || undefined,
        precio_distribuidor_docena: Number(distribuidor.docena) || undefined,
        precio_distribuidor_caja: Number(distribuidor.mayor) || undefined,
        costo_normal: costoNormal || 0,
        costo_distribuidor: costoDist || 0,
      } as any;
    })(),
  });

  const coloresSurtidos = watch("colores_surtido") || [];

  const codigo = watch("codigo");
  const tipoFlor = watch("tipo_flor");
  const composicion = watch("composicion");
  const material = watch("material");
  const presentacion = watch("presentacion");
  const follaje = watch("follaje");
  const numeroCabezas = watch("numero_cabezas");
  const tamano = watch("tamano");
  const unidadesPorCaja = watch("unidades_por_caja");

  // Atributos al abrir en modo edición: solo se regenera la descripción si el
  // usuario modifica algún atributo (no se pisa una descripción intacta).
  const atributosInicialesRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!open) {
      atributosInicialesRef.current = null;
      return;
    }

    const atributosActuales: Record<string, unknown> = {
      codigo,
      tipo_flor: tipoFlor,
      material,
      composicion,
      presentacion,
      follaje,
      numero_cabezas: numeroCabezas,
      tamano,
      unidades_por_caja: unidadesPorCaja,
    };

    if (isEditing) {
      if (!atributosInicialesRef.current) {
        atributosInicialesRef.current = atributosActuales;
        return;
      }
      const iniciales = atributosInicialesRef.current;
      const huboCambio = Object.entries(atributosActuales).some(
        ([clave, valor]) => String(valor ?? "") !== String(iniciales[clave] ?? ""),
      );
      if (!huboCambio) return;
    }

    const descripcionGenerada = generarDescripcionProducto({
      codigo,
      tipo_flor: tipoFlor,
      material,
      composicion,
      presentacion,
      follaje,
      numero_cabezas: numeroCabezas,
      tamano,
      unidades_por_caja: unidadesPorCaja,
    });

    setValue("descripcion", descripcionGenerada, { shouldValidate: true });
  }, [
    open,
    isEditing,
    codigo,
    tipoFlor,
    composicion,
    material,
    presentacion,
    follaje,
    numeroCabezas,
    tamano,
    unidadesPorCaja,
    setValue,
  ]);

  useEffect(() => {
    if (!open) return;
    setLoadingFilters(true);

    const catsProp = categoriasProp?.length ? categoriasProp : null;
    const almsProp = almacenesProp?.length ? almacenesProp : null;
    if (catsProp) setCategorias(catsProp);
    if (almsProp) setAlmacenes(almsProp);

    if (catsProp && almsProp) {
      setLoadingFilters(false);
      return;
    }

    let cancelled = false;
    const fetchFilters = async () => {
      try {
        const [catRes, almRes] = await Promise.all([
          catsProp ? Promise.resolve(null) : apiClient("/categorias?limit=100"),
          almsProp ? Promise.resolve(null) : apiClient("/almacenes?activo=true&limit=100"),
        ]);
        if (cancelled) return;
        if (!catsProp) setCategorias(catRes?.data || []);
        if (!almsProp) setAlmacenes(almRes?.data || []);
      } catch (error) {
        console.error("Error fetching filters:", error);
        if (!cancelled) {
          showToast.error("No se pudieron cargar categorías y ubicaciones");
        }
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    };
    fetchFilters();
    return () => { cancelled = true; };
  }, [open, categoriasProp, almacenesProp]);

  useEffect(() => {
    if (isEditing && productoInicial?.foto_url) {
      setImagePreview(getImageUrl(productoInicial.foto_url, '150'));
    } else if (!isEditing) {
      setImagePreview(null);
      setImageFile(null);
    }
  }, [isEditing, productoInicial, open]);

  const initialColorsForModal: ColorItem[] = (coloresSurtidos as string[]).map((name) => ({
    name,
    hex: resolveColorHex(name),
  }));

  const coloresSurtidosParaGuardar = coloresSurtidos as string[];

  const resetForm = () => {
    reset(DEFAULT_FORM_VALUES as any);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFormSubmit: SubmitHandler<ProductoFormData> = async (data) => {
    const coloresArray = Array.isArray(data.colores_surtido) ? data.colores_surtido : [];
    let fotoUrlToSend = isEditing ? productoInicial?.foto_url || null : null;

    if (imageFile) {
      let uploadedUrl: string | null = null;
      try {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await uploadFile('/productos/upload', formData);

        const rawUrl = uploadRes?.url || uploadRes?.data?.url || '';
        const isValidUrl = rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '' &&
          (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('/'));

        if (isValidUrl) {
          uploadedUrl = rawUrl.trim();
        }
      } catch (err) {
        console.warn("Fallo endpoint de subida de imagen:", err);
      }

      if (!uploadedUrl) {
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

      precio_tienda_unidad: Number(data.precio_tienda_unidad) || 0,
      precio_tienda_docena: Number(data.precio_tienda_docena) || 0,
      precio_tienda_caja: Number(data.precio_tienda_caja) || 0,
      precio_distribuidor_unidad: Number(data.precio_distribuidor_unidad) || 0,
      precio_distribuidor_docena: Number(data.precio_distribuidor_docena) || 0,
      precio_distribuidor_caja: Number(data.precio_distribuidor_caja) || 0,
      costo_normal: Number(data.costo_normal) || 0,
      costo_distribuidor: Number(data.costo_distribuidor) || 0,
    };

    if (data.tipo_flor?.trim()) payload.tipo_flor = data.tipo_flor.trim();
    if (data.material?.trim()) payload.material = data.material.trim();
    if (data.composicion?.trim()) payload.composicion = data.composicion.trim();
    if (data.presentacion?.trim()) payload.presentacion = data.presentacion.trim();
    if (data.follaje?.trim()) payload.follaje = data.follaje.trim();
    if (data.tamano?.trim()) payload.tamano = data.tamano.trim();
    if (data.numero_cabezas) payload.numero_cabezas = Number(data.numero_cabezas);

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
      resetForm();
      onClose();
    } catch (error: any) {
      console.error("Error guardando producto:", error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Error al guardar el producto';
      toast.error(errorMessage);
    }
  };

  const cleanNumberInputProps = (fieldName: any) => {
    const reg = register(fieldName, {
      valueAsNumber: true,
      setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
    });
    return {
      ...reg,
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        if (e.target.value === "0") {
          e.target.value = "";
        }
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        reg.onBlur(e);
      },
    };
  };

  return (
    <>
      <Modal open={open} onClose={handleClose} title={title} maxWidth="lg">
        <div className="flex flex-col max-h-[80vh]">
          <form onSubmit={handleSubmit(handleFormSubmit as any)} className="flex flex-col flex-1 min-h-0">
            {/* ÁREA CON SCROLL (SOLO PARA EL CONTENIDO) */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* SECCIÓN 1: DATOS PRINCIPALES */}
              <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    label="CÓDIGO"
                    placeholder="Ej: RYG18-NU02"
                    error={errors.codigo?.message as string}
                    {...register("codigo")}
                    disabled={isEditing}
                    onChange={(e) => setValue("codigo", e.target.value.toUpperCase(), { shouldValidate: true })}
                  />
                </div>
              </div>

              {/* SECCIÓN 2: ATRIBUTOS FÍSICOS */}
              <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    label="CATEGORÍA"
                    error={errors.id_categoria?.message as string}
                    {...register("id_categoria", {
                      setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                    })}
                    disabled={loadingFilters}
                  >
                    <option value="">Seleccionar</option>
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nombre_categoria}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="TIPO DE FLOR"
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
                  <Input
                    label="COMPOSICIÓN"
                    placeholder="Ramo"
                    error={errors.composicion?.message as string}
                    {...register("composicion")}
                  />
                  <Input
                    label="PRESENTACIÓN"
                    placeholder="Ramo"
                    error={errors.presentacion?.message as string}
                    {...register("presentacion")}
                  />
                  <Input
                    label="FOLLAJE"
                    placeholder="Verde"
                    error={errors.follaje?.message as string}
                    {...register("follaje")}
                  />
                  <Input
                    label="Nº CABEZAS"
                    type="number"
                    min="1"
                    placeholder="18"
                    error={errors.numero_cabezas?.message as string}
                    {...cleanNumberInputProps("numero_cabezas")}
                  />
                </div>
              </div>

              {/* SECCIÓN 3: COLORES SURTIDOS Y DETALLES */}
              <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="TAMAÑO"
                    placeholder="35cm aprox"
                    error={errors.tamano?.message as string}
                    {...register("tamano")}
                  />
                  <Select
                    label="UBICACIÓN"
                    error={errors.id_almacen?.message as string}
                    {...register("id_almacen", {
                      setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                    })}
                    disabled={loadingFilters}
                  >
                    <option value="">Seleccionar</option>
                    {almacenes.map((a) => (
                      <option key={a.id_almacen} value={a.id_almacen}>
                        {a.nombre}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="UNIDADES POR CAJA"
                    type="number"
                    min="1"
                    placeholder="12"
                    error={errors.unidades_por_caja?.message as string}
                    {...cleanNumberInputProps("unidades_por_caja")}
                  />
                  <Input
                    label="STOCK ACTUAL"
                    type="number"
                    min="0"
                    placeholder="10"
                    error={errors.stock_principal?.message as string}
                    {...cleanNumberInputProps("stock_principal")}
                  />
                  <Input
                    label="STOCK MÍNIMO"
                    type="number"
                    min="0"
                    placeholder="10"
                    error={errors.stock_minimo?.message as string}
                    {...cleanNumberInputProps("stock_minimo")}
                  />
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      COLORES SURTIDOS
                    </label>
                    <Button
                      type="button"
                      variant='secondary'
                      onClick={() => setIsColorModalOpen(true)}
                    >
                      Configurar {coloresSurtidosParaGuardar.length > 0 && `(${coloresSurtidosParaGuardar.length})`}
                    </Button>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: DESCRIPCIÓN AUTOGENERADA */}
              <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-bold text-brand-options uppercase tracking-wider text-gray-600 flex items-center gap-1">
                    DESCRIPCIÓN
                  </h3>
                </div>
                <Textarea
                  label=""
                  placeholder="Se autogenera según los atributos físicos completados"
                  error={errors.descripcion?.message as string}
                  rows={3}
                  {...register("descripcion")}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Puede editar manualmente. La autogeneración se reactiva al cambiar atributos físicos.
                </p>
              </div>

              {/* SECCIÓN 5: MATRIZ DE PRECIOS */}
              <Table className="text-center text-xs">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-center text-brand-ink py-3">
                      UNIDAD DE MEDIDA
                    </TableHead>
                    <TableHead className="text-center text-estado-enviado py-3 bg-estado-enviado-soft/20">
                      PRECIO TIENDA (S/)
                    </TableHead>
                    <TableHead className="text-center text-brand-ink py-3 bg-brand-soft/20">
                      DISTRIBUIDOR (S/)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* UNIDAD */}
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="font-bold text-brand-ink py-2.5 text-center">
                      UNIDAD
                    </TableCell>
                    <TableCell className="p-1 bg-estado-enviado-soft/40">
                      <div className="flex items-center justify-center gap-1 font-medium text-estado-enviado-text">
                        <span className="text-estado-enviado font-semibold select-none">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-20 text-left bg-transparent outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-estado-enviado/50 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          {...cleanNumberInputProps("precio_tienda_unidad")}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-1 bg-brand-soft/40">
                      <div className="flex items-center justify-center gap-1 font-medium text-brand-subtitle">
                        <span className="text-brand-ink font-semibold select-none">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-20 text-left bg-transparent outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-brand-primary px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          {...cleanNumberInputProps("precio_distribuidor_unidad")}
                        />
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* DOCENA */}
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="font-bold text-brand-ink py-2.5 text-center">
                      DOCENA
                    </TableCell>
                    <TableCell className="p-1 bg-estado-enviado-soft/40">
                      <div className="flex items-center justify-center gap-1 font-medium text-estado-enviado-text">
                        <span className="text-estado-enviado font-semibold select-none">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-20 text-left bg-transparent outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-estado-enviado/50 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          {...cleanNumberInputProps("precio_tienda_docena")}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-1 bg-brand-soft/40">
                      <div className="flex items-center justify-center gap-1 font-medium text-brand-subtitle">
                        <span className="text-brand-ink font-semibold select-none">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-20 text-left bg-transparent outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-brand-primary px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          {...cleanNumberInputProps("precio_distribuidor_docena")}
                        />
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* CAJA */}
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="font-bold text-brand-ink py-2.5 text-center">
                      CAJA
                    </TableCell>
                    <TableCell className="p-1 bg-estado-enviado-soft/40">
                      <div className="flex items-center justify-center gap-1 font-medium text-estado-enviado-text">
                        <span className="text-estado-enviado font-semibold select-none">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-20 text-left bg-transparent outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-estado-enviado/50 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          {...cleanNumberInputProps("precio_tienda_caja")}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-1 bg-brand-soft/40">
                      <div className="flex items-center justify-center gap-1 font-medium text-brand-subtitle">
                        <span className="text-brand-ink font-semibold select-none">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-20 text-left bg-transparent outline-none py-1 rounded focus:bg-white focus:ring-2 focus:ring-brand-primary px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          {...cleanNumberInputProps("precio_distribuidor_caja")}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* ÁREA DE IMAGEN */}
              <div className="w-full bg-gray-50/50 border border-gray-200/50 rounded-xl p-4 flex items-center justify-center">
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
                  <div className="w-full max-w-[515px] inline-flex justify-between items-center gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="size-14 relative rounded-lg border border-neutral-300 overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-white"
                    >
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={150}
                        height={150}
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, "150")}
                      />
                    </div>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 min-h-11 px-3.5 rounded-lg border border-brand-primary flex justify-start items-center gap-2.5 bg-white cursor-pointer hover:border-brand-hover transition-colors overflow-hidden"
                    >
                      <span className="text-gray-600 text-xs font-medium truncate">
                        {imageFile?.name || productoInicial?.foto_url?.split("/").pop() || "imagen.png"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="size-10 rounded-lg flex justify-center items-center shrink-0 hover:bg-estado-rechazado-soft hover:border-estado-rechazado/30 group transition-colors"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-5 h-5 text-red-800 group-hover:text-red-600 transition-colors" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
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
                    className="w-full h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:border-brand-hover hover:text-brand-ink cursor-pointer transition-colors"
                  >
                    <CloudUpload className="w-5 h-5" />
                    <span className="text-xs font-medium">
                      Arrastra o selecciona la imagen del producto
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* BOTONES DE ACCIÓN FIJOS AL FINAL */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 mt-2 border-t border-gray-100 bg-white shrink-0">
              <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>
                Limpiar
              </Button>
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </div>
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