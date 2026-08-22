import { useState } from 'react';
import { ArrowRight, FilePlus2, Landmark, Store, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';

const initial = {
  cliente_nombre: '',
  email: '',
  telefono: '',
  tipo_documento: 'DNI',
  documento: '',
  tipo_precio: 'normal'
};

export function CreateQuotePage() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState([]);
  const navigate = useNavigate();

  const field = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
    setInvalid(current => current.filter(item => item !== key));
  };

  const props = key => ({
    value: form[key],
    onChange: event => field(key, event.target.value),
    className: `block w-full rounded-xl border py-2.5 px-3 text-xs outline-none transition-all placeholder-neutral-400
      ${invalid.includes(key) 
        ? 'border-red-400 bg-red-50/50 focus:border-red-500' 
        : 'border-[#d9d9d9] focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5'}`
  });

  async function submit() {
    const missing = ['cliente_nombre', 'email', 'telefono', 'documento'].filter(key => !form[key].trim());
    setInvalid(missing);
    if (missing.length) return;
    setLoading(true);
    try {
      const data = await apiJson('/api/cotizaciones', {
        method: 'POST',
        body: JSON.stringify({
          cliente_nombre: form.cliente_nombre.trim(),
          email: form.email.trim(),
          telefono: form.telefono.trim(),
          ruc_dni: `${form.tipo_documento}: ${form.documento.trim()}`,
          tipo_precio: form.tipo_precio
        })
      });
      navigate(`/cotizacion-detalle?id=${data.id_cotizacion}`);
    } catch (error) {
      setInvalid([]);
      window.alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout title="Crear cotización">
      <div className="max-w-2xl mx-auto space-y-6 select-none animate-in">
        {/* Card Formulario */}
        <div className="bg-white border border-[#d9d9d9] rounded-2xl p-8 shadow-xs">
          {/* Cabecera */}
          <div className="flex items-start justify-between border-b border-[#d9d9d9] pb-6 mb-8">
            <div>
              <h2 className="text-base font-bold text-[#414141] tracking-tight">Nueva cotización</h2>
              <p className="text-xs text-neutral-450 mt-1 leading-relaxed">
                Ingresa los datos generales del cliente para iniciar el proceso de cotización
              </p>
            </div>
            <div className="rounded-lg p-2 bg-[#f8fafc] text-neutral-600">
              <FilePlus2 className="h-5 w-5" />
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-5">
            {/* Cliente */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Nombre del Cliente
              </label>
              <input {...props('cliente_nombre')} placeholder="Ej. Constructora Gold S.A.C." />
            </div>

            {/* Email y Teléfono */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Correo electrónico
                </label>
                <input {...props('email')} type="email" placeholder="cliente@correo.com" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Teléfono
                </label>
                <input {...props('telefono')} inputMode="tel" placeholder="Ej. 999 999 999" />
              </div>
            </div>

            {/* DNI / RUC */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Documento de identidad
              </label>
              <div className="grid grid-cols-[100px_1fr] gap-3">
                <div className="relative">
                  <select
                    value={form.tipo_documento}
                    onChange={event => field('tipo_documento', event.target.value)}
                    className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-8"
                  >
                    <option>DNI</option>
                    <option>RUC</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-neutral-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>
                <input {...props('documento')} inputMode="numeric" placeholder="Número de documento" />
              </div>
            </div>

            {/* Selector de Tarifa (Tarjetas de Selección Premium) */}
            <div className="space-y-3 pt-2">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Tipo de Cliente (Tarifa)
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Opción Tienda */}
                <button
                  type="button"
                  onClick={() => field('tipo_precio', 'normal')}
                  className={`
                    flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 outline-none
                    ${form.tipo_precio === 'normal'
                      ? 'border-[#7b1c1c] bg-[#fdf2f2] text-[#7b1c1c] shadow-2xs font-semibold'
                      : 'border-[#d9d9d9] text-[#414141] hover:border-[#7b1c1c]'}
                  `}
                >
                  <div className={`p-2 rounded-lg ${form.tipo_precio === 'normal' ? 'bg-[#7b1c1c] text-white' : 'bg-[#f8fafc]'}`}>
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Tarifa Tienda</h4>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Precios estándar por unidad</p>
                  </div>
                </button>

                {/* Opción Mayorista */}
                <button
                  type="button"
                  onClick={() => field('tipo_precio', 'distribuidor')}
                  className={`
                    flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 outline-none
                    ${form.tipo_precio === 'distribuidor'
                      ? 'border-[#7b1c1c] bg-[#fdf2f2] text-[#7b1c1c] shadow-2xs font-semibold'
                      : 'border-[#d9d9d9] text-[#414141] hover:border-[#7b1c1c]'}
                  `}
                >
                  <div className={`p-2 rounded-lg ${form.tipo_precio === 'distribuidor' ? 'bg-[#7b1c1c] text-white' : 'bg-[#f8fafc]'}`}>
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Tarifa Mayorista</h4>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Precios con descuento distribuidor</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {invalid.length > 0 && (
            <div className="mt-6 rounded-xl border border-red-105 bg-red-50/50 p-3 text-xs font-medium text-red-650">
              Completa todos los campos requeridos.
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 border-t border-[#d9d9d9] pt-6 mt-8">
            <Link
              to="/cotizaciones"
              className="rounded-xl border border-[#d9d9d9] bg-white px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#f8fafc] transition-all shadow-2xs"
            >
              Cancelar
            </Link>
            <button
              onClick={submit}
              disabled={loading}
              className="rounded-xl bg-[#7b1c1c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#601414] transition-all shadow-xs flex items-center gap-2"
            >
              <span>{loading ? 'Creando...' : 'Continuar'}</span>
              {!loading && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
