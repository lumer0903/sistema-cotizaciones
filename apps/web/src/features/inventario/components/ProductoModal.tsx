"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm, SubmitHandler, Path, DefaultValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CrearProductoSchema } from "@goldcontinent/shared/schemas/productos";
import { generarDescripcionProducto } from "@goldcontinent/shared/constants/descripcion";
import {
  ColorConfigModal,
  ColorItem,
  resolveColorHex,
} from "@/features/inventario/components/ColorConfigModal";
import { apiClient, uploadFile } from "@/lib/apiClient";
import { getImageUrl } from "@/lib/imageUtils";
import {
  Modal,
  Input,
  Select,
  Button,
  Textarea,
  ConfirmModal,
} from "@/components/ui";
import { PriceMatrix, PriceUnit, PriceField } from "./producto-form/PriceMatrix";
import { ImageUploader } from "./producto-form/ImageUploader";
import { SurtidoColorsField } from "./producto-form/SurtidoColorsField";
import { ProductoInventario } from "@goldcontinent/shared/types/inventario";
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
  onGuardar?: (datos: ProductoPayload) => void;
  categorias?: Categoria[];
  almacenes?: Almacen[];
}

type ProductoFormData = z.infer<typeof CrearProductoSchema>;

/** Cuerpo enviado al backend (tipado, sin `any`). */
interface ProductoPayload {
  codigo: string;
  descripcion?: string;
  id_categoria: number;
  id_almacen: number;
  stock_principal: number;
  stock_minimo: number;
  unidades_por_caja: number;
  colores_surtido: string[];
  foto_url: string | null;
  precio_tienda_unidad: number;
  precio_tienda_docena: number;
  precio_tienda_caja: number;
  precio_distribuidor_unidad: number;
  precio_distribuidor_docena: number;
  precio_distribuidor_caja: number;
  costo_normal: number;
  costo_distribuidor: number;
  tipo_flor?: string;
  material?: string;
  composicion?: string;
  presentacion?: string;
  follaje?: string;
  tamano?: string;
  numero_cabezas?: number;
}

const DEFAULT_FORM_VALUES: DefaultValues<ProductoFormData> = {
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

const PRICE_UNITS: PriceUnit[] = ["unidad", "docena", "caja"];

/** Tamaño máximo (bytes) para el fallback base64 si falla la subida. */
const MAX_BASE64_FALLBACK = 500 * 1024;

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
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const objectUrlRef = useRef<string | null>(null);
  const isEditing = modo === "editar" && !!productoInicial;
  const title = isEditing ? "Editar Producto" : "Agregar Producto";

  /**
   * zod usa `z.coerce.number()` (input unknown) y el form trabaja con number,
   * por eso el resolver necesita este cast local y tipado.
   */
  const resolver = zodResolver(CrearProductoSchema) as unknown as Resolver<ProductoFormData>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductoFormData>({
    resolver,
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onChange",
    values: (() => {
      if (!isEditing || !productoInicial) return undefined;
      const inv = productoInicial as unknown as Record<string, unknown> & {
        stock_actual?: Array<{ id_almacen?: number }>;
        precios_actuales?: Record<string, unknown>;
        precios?: Record<string, unknown>;
      };
      const almacenPrincipal = inv.stock_actual?.[0]?.id_almacen || 1;
      const { tienda, distribuidor } = obtenerPreciosEstandarizados(productoInicial);
      const costoNormal = Number(
        inv.precios_actuales?.costo_normal ?? inv.precios?.costo_normal ?? inv.costo_normal ?? 0
      );
      const costoDist = Number(
        inv.precios_actuales?.costo_distribuidor ??
          inv.precios?.costo_distribuidor ??
          inv.costo_distribuidor ??
          0
      );
      // `as ProductoFormData`: los precios/atributos pueden quedar undefined
      // en edición (producto sin precio cargado) y zod exige capturarlos.
      return {
        codigo: (inv.codigo as string) || "",
        id_categoria: (inv.id_categoria as number) || 1,
        id_almacen: almacenPrincipal,
        tipo_flor: (inv.tipo_flor as string) || "",
        material: (inv.material as string) || "",
        composicion: (inv.composicion as string) || "",
        presentacion: (inv.presentacion as string) || "",
        follaje: (inv.follaje as string) || "",
        numero_cabezas: (inv.numero_cabezas as number) ?? undefined,
        tamano: (inv.tamano as string) || "",
        unidades_por_caja: (inv.unidades_por_caja as number) || 1,
        stock_principal: (inv.stock_principal as number) || 0,
        stock_minimo: (inv.stock_minimo as number) || 10,
        descripcion: (inv.descripcion as string) || "",
        colores_surtido: (inv.colores_surtido as string[]) || [],
        precio_tienda_unidad: Number(tienda.unidad) || undefined,
        precio_tienda_docena: Number(tienda.docena) || undefined,
        precio_tienda_caja: Number(tienda.mayor) || undefined,
        precio_distribuidor_unidad: Number(distribuidor.unidad) || undefined,
        precio_distribuidor_docena: Number(distribuidor.docena) || undefined,
        precio_distribuidor_caja: Number(distribuidor.mayor) || undefined,
        costo_normal: costoNormal || 0,
        costo_distribuidor: costoDist || 0,
      } as ProductoFormData;
    })(),
  });

  const coloresSurtidos = (watch("colores_surtido") || []) as string[];

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
        ([clave, valor]) => String(valor ?? "") !== String(iniciales[clave] ?? "")
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
    return () => {
      cancelled = true;
    };
  }, [open, categoriasProp, almacenesProp]);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (isEditing && productoInicial?.foto_url) {
      setImagePreview(getImageUrl(productoInicial.foto_url, "150"));
      revokeObjectUrl();
    } else if (!isEditing) {
      setImagePreview(null);
      setImageFile(null);
      revokeObjectUrl();
    }
    return revokeObjectUrl;
  }, [isEditing, productoInicial, open]);

  const initialColorsForModal: ColorItem[] = coloresSurtidos.map((name) => ({
    name,
    hex: resolveColorHex(name),
  }));

  const resetForm = () => {
    reset(DEFAULT_FORM_VALUES);
    setImageFile(null);
    setImagePreview(null);
    revokeObjectUrl();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRequestReset = () => {
    if (isDirty) {
      setConfirmResetOpen(true);
    } else {
      resetForm();
    }
  };

  const handleImageSelect = (file: File) => {
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageFile(file);
    setImagePreview(url);
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    revokeObjectUrl();
  };

  const handleFormSubmit: SubmitHandler<ProductoFormData> = async (data) => {
    const coloresArray = Array.isArray(data.colores_surtido) ? data.colores_surtido : [];
    let fotoUrlToSend: string | null = isEditing ? productoInicial?.foto_url || null : null;

    if (imageFile) {
      let uploadedUrl: string | null = null;
      try {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await uploadFile("/productos/upload", formData);

        const rawUrl: unknown = uploadRes?.url || uploadRes?.data?.url || "";
        const isValidUrl =
          typeof rawUrl === "string" &&
          rawUrl.trim() !== "" &&
          (rawUrl.startsWith("http://") ||
            rawUrl.startsWith("https://") ||
            rawUrl.startsWith("data:") ||
            rawUrl.startsWith("/"));

        if (isValidUrl) uploadedUrl = rawUrl.trim();
      } catch (err) {
        console.warn("Fallo endpoint de subida de imagen:", err);
      }

      if (uploadedUrl) {
        fotoUrlToSend = uploadedUrl;
      } else if (imageFile.size <= MAX_BASE64_FALLBACK) {
        // Fallback local solo para imágenes pequeñas (evita payloads gigantes)
        fotoUrlToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      } else {
        showToast.error(
          "No se pudo subir la imagen (supera el tamaño permitido). Se guardará el producto sin imagen."
        );
        fotoUrlToSend = isEditing ? productoInicial?.foto_url || null : null;
      }
    }

    const payload: ProductoPayload = {
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

      onSuccess?.();
      onGuardar?.(payload);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error guardando producto:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      showToast.error(err?.response?.data?.message || err?.message || "Error al guardar el producto");
    }
  };

  /** Registro numérico: convierte vacío a undefined y limpia el 0 al enfocar. */
  const cleanNumberInputProps = (fieldName: Path<ProductoFormData>) => {
    const reg = register(fieldName, {
      valueAsNumber: true,
      setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
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

  // Props de registro de la matriz de precios (una sola fuente)
  const priceProps = useMemo(() => {
    const build = (prefix: "precio_tienda" | "precio_distribuidor") =>
      Object.fromEntries(
        PRICE_UNITS.map((unit) => [unit, cleanNumberInputProps(`${prefix}_${unit}` as PriceField)])
      ) as Record<PriceUnit, ReturnType<typeof cleanNumberInputProps>>;
    return { tienda: build("precio_tienda"), distribuidor: build("precio_distribuidor") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceErrors = {
    precio_tienda_unidad: errors.precio_tienda_unidad?.message,
    precio_tienda_docena: errors.precio_tienda_docena?.message,
    precio_tienda_caja: errors.precio_tienda_caja?.message,
    precio_distribuidor_unidad: errors.precio_distribuidor_unidad?.message,
    precio_distribuidor_docena: errors.precio_distribuidor_docena?.message,
    precio_distribuidor_caja: errors.precio_distribuidor_caja?.message,
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        closeDisabled={isSubmitting}
        title={title}
        maxWidth="lg"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={handleRequestReset}
              disabled={isSubmitting}
            >
              Restablecer
            </Button>
            <div className="flex gap-2 sm:gap-3">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="producto-form"
                variant="primary"
                loading={isSubmitting}
              >
                Guardar
              </Button>
            </div>
          </>
        }
      >
        <form
          id="producto-form"
          noValidate
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-5"
        >
          {/* Campos del producto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Código"
              placeholder="Ej: RYG18-NU02"
              error={errors.codigo?.message}
              {...register("codigo")}
              disabled={isEditing}
              onChange={(e) =>
                setValue("codigo", e.target.value.toUpperCase(), { shouldValidate: true })
              }
            />
            <Select
              label="Categoría"
              error={errors.id_categoria?.message}
              {...register("id_categoria", {
                setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
              })}
              value={watch("id_categoria") ?? ""}
              disabled={loadingFilters}
            >
              <option value="">Seleccionar</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre_categoria}
                </option>
              ))}
            </Select>
            <Select
              label="Ubicación"
              error={errors.id_almacen?.message}
              {...register("id_almacen", {
                setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
              })}
              value={watch("id_almacen") ?? ""}
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
              label="Tipo de flor"
              placeholder="Rosa"
              autoComplete="off"
              error={errors.tipo_flor?.message}
              {...register("tipo_flor")}
            />
            <Input
              label="Material"
              placeholder="Tela Premium"
              error={errors.material?.message}
              {...register("material")}
            />
            <Input
              label="Composición"
              placeholder="Ramo"
              error={errors.composicion?.message}
              {...register("composicion")}
            />
            <Input
              label="Presentación"
              placeholder="Ramo"
              error={errors.presentacion?.message}
              {...register("presentacion")}
            />
            <Input
              label="Follaje"
              placeholder="Verde"
              error={errors.follaje?.message}
              {...register("follaje")}
            />
            <Input
              label="Nº cabezas"
              type="number"
              min="1"
              placeholder="18"
              error={errors.numero_cabezas?.message}
              {...cleanNumberInputProps("numero_cabezas")}
            />
            <Input
              label="Tamaño"
              placeholder="35cm aprox"
              error={errors.tamano?.message}
              {...register("tamano")}
            />
            <Input
              label="Unidades por caja"
              type="number"
              min="1"
              placeholder="12"
              error={errors.unidades_por_caja?.message}
              {...cleanNumberInputProps("unidades_por_caja")}
            />
            <Input
              label="Stock actual"
              type="number"
              min="0"
              placeholder="10"
              error={errors.stock_principal?.message}
              {...cleanNumberInputProps("stock_principal")}
            />
            <Input
              label="Stock mínimo"
              type="number"
              min="0"
              placeholder="10"
              error={errors.stock_minimo?.message}
              {...cleanNumberInputProps("stock_minimo")}
            />
            <SurtidoColorsField
              colors={coloresSurtidos}
              onConfigure={() => setIsColorModalOpen(true)}
            />
          </div>
          {errors.colores_surtido?.message && (
            <p className="text-xs font-medium text-danger" role="alert">
              {errors.colores_surtido.message}
            </p>
          )}

          {/* Descripción autogenerada */}
          <Textarea
            label="Descripción"
            placeholder="Se autogenera según los atributos físicos completados"
            error={errors.descripcion?.message}
            rows={3}
            {...register("descripcion")}
          />

          {/* Matriz de precios (tipo de cliente: Tienda / Distribuidor) */}
          <PriceMatrix
            tienda={priceProps.tienda}
            distribuidor={priceProps.distribuidor}
            errors={priceErrors}
          />

          {/* Imagen del producto */}
          <ImageUploader
            previewUrl={imagePreview}
            fileName={imageFile?.name || productoInicial?.foto_url?.split("/").pop() || null}
            onFileSelect={handleImageSelect}
            onRemove={handleImageRemove}
            disabled={isSubmitting}
          />
        </form>
      </Modal>

      <ConfirmModal
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          resetForm();
          setConfirmResetOpen(false);
        }}
        title="Restablecer formulario"
        message="Se perderán todos los cambios realizados. ¿Desea continuar?"
        confirmLabel="Restablecer"
        variant="danger"
      />

      <ColorConfigModal
        open={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        initialColors={initialColorsForModal}
        onSave={(colors) => {
          setValue(
            "colores_surtido",
            colors.map((c) => c.name),
            { shouldValidate: true }
          );
        }}
      />
    </>
  );
}
