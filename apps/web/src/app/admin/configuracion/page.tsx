'use client';

import { Settings, Bell, Database, CreditCard, Save, FileText, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/lib/toast';
import { getConfiguracion, saveAllConfiguracion } from '@/features/configuracion/api/configApi';

const MONEDA_OPTIONS = [
  { label: 'PEN - Soles', value: 'PEN' },
  { label: 'USD - Dólares', value: 'USD' },
];

const TEMA_OPTIONS = [
  { label: 'Sistema', value: 'sistema' },
  { label: 'Claro', value: 'claro' },
  { label: 'Oscuro', value: 'oscuro' },
];

const IDIOMA_OPTIONS = [
  { label: 'Español', value: 'es' },
  { label: 'English', value: 'en' },
];

interface Configuracion {
  empresa_nombre: string;
  empresa_ruc: string;
  empresa_direccion: string;
  empresa_telefono: string;
  empresa_email: string;
  moneda: string;
  igv_porcentaje: number;
  serie_boleta: string;
  serie_factura: string;
  correlativo_boleta: number;
  correlativo_factura: number;
  costo_carreta_default: number;
  incluir_carreta_default: boolean;
  dias_vencimiento_default: number;
  limite_credito_default: string;
  tasa_mora_default: string;
  notificaciones_email: boolean;
  notificaciones_stock_bajo: boolean;
  notificaciones_cotizaciones_vencidas: boolean;
  backup_automatico: boolean;
  tema: 'claro' | 'oscuro' | 'sistema';
  idioma: string;
}

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'empresa' | 'documentos' | 'comercial' | 'notificaciones' | 'sistema'>('empresa');

  const [config, setConfig] = useState<Configuracion>({
    empresa_nombre: 'Gold Continent SAC',
    empresa_ruc: '20123456789',
    empresa_direccion: 'Av. Principal 123, Lima, Perú',
    empresa_telefono: '+51 1 234 5678',
    empresa_email: 'ventas@goldcontinent.com',
    moneda: 'PEN',
    igv_porcentaje: 18,
    serie_boleta: 'B001',
    serie_factura: 'F001',
    correlativo_boleta: 1,
    correlativo_factura: 1,
    costo_carreta_default: 15,
    incluir_carreta_default: true,
    dias_vencimiento_default: 30,
    limite_credito_default: '5000',
    tasa_mora_default: '1.5',
    notificaciones_email: true,
    notificaciones_stock_bajo: true,
    notificaciones_cotizaciones_vencidas: true,
    backup_automatico: false,
    tema: 'sistema',
    idioma: 'es',
  });

  useEffect(() => {
    let cancelled = false;
    getConfiguracion()
      .then((data) => {
        if (cancelled) return;
        setConfig((prev) => {
          const next = { ...prev };
          (Object.keys(prev) as Array<keyof Configuracion>).forEach((key) => {
            const raw = data[key as string];
            if (raw === undefined) return;
            const current = prev[key];
            if (typeof current === 'boolean') {
              (next as any)[key] = raw === 'true';
            } else if (typeof current === 'number') {
              (next as any)[key] = Number(raw);
            } else {
              (next as any)[key] = raw;
            }
          });
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) showToast.info('Usando valores por defecto de configuración');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = <K extends keyof Configuracion>(key: K, value: Configuracion[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const entries = (Object.keys(config) as Array<keyof Configuracion>).map((key) => ({
        clave: key as string,
        valor: String(config[key]),
      }));
      await saveAllConfiguracion(entries);
      setSaved(true);
      showToast.success('Configuración guardada');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudo guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Settings },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'comercial', label: 'Comercial', icon: CreditCard },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'sistema', label: 'Sistema', icon: Database },
  ];

  return (
    <>
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex gap-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-brand-primary text-brand-ink'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 font-['DM_Sans']">
        {loading ? (
          <div className="animate-pulse space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-3/4" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1">
              {activeTab === 'empresa' && (
                <div className="max-w-3xl space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Datos de la Empresa</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Nombre Comercial"
                      type="text"
                      value={config.empresa_nombre}
                      onChange={(e) => handleChange('empresa_nombre', e.target.value)}
                    />
                    <Input
                      label="RUC"
                      type="text"
                      value={config.empresa_ruc}
                      onChange={(e) => handleChange('empresa_ruc', e.target.value)}
                      maxLength={11}
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Dirección"
                        type="text"
                        value={config.empresa_direccion}
                        onChange={(e) => handleChange('empresa_direccion', e.target.value)}
                      />
                    </div>
                    <Input
                      label="Teléfono"
                      type="tel"
                      value={config.empresa_telefono}
                      onChange={(e) => handleChange('empresa_telefono', e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={config.empresa_email}
                      onChange={(e) => handleChange('empresa_email', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'documentos' && (
                <div className="max-w-3xl space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Configuración de Documentos</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--color-brand-ink)' }}>Moneda</label>
                      <Select
                        value={config.moneda}
                        onChange={(e) => handleChange('moneda', String(e.target.value))}
                        options={MONEDA_OPTIONS}
                        className="w-full"
                      />
                    </div>
                    <Input
                      label="IGV (%)"
                      type="number"
                      value={config.igv_porcentaje}
                      onChange={(e) => handleChange('igv_porcentaje', Number(e.target.value))}
                      min={0}
                      max={100}
                      step={0.1}
                    />
                    <Input
                      label="Serie Boleta"
                      type="text"
                      value={config.serie_boleta}
                      onChange={(e) => handleChange('serie_boleta', e.target.value.toUpperCase())}
                      maxLength={4}
                    />
                    <Input
                      label="Serie Factura"
                      type="text"
                      value={config.serie_factura}
                      onChange={(e) => handleChange('serie_factura', e.target.value.toUpperCase())}
                      maxLength={4}
                    />
                    <Input
                      label="Correlativo Boleta"
                      type="number"
                      value={config.correlativo_boleta}
                      onChange={(e) => handleChange('correlativo_boleta', Number(e.target.value))}
                      min={1}
                    />
                    <Input
                      label="Correlativo Factura"
                      type="number"
                      value={config.correlativo_factura}
                      onChange={(e) => handleChange('correlativo_factura', Number(e.target.value))}
                      min={1}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'comercial' && (
                <div className="max-w-3xl space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Parámetros Comerciales</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Días Vencimiento Default"
                      type="number"
                      value={config.dias_vencimiento_default}
                      onChange={(e) => handleChange('dias_vencimiento_default', Number(e.target.value))}
                      min={1}
                      max={360}
                    />
                    <Input
                      label="Límite Crédito Default (S/)"
                      type="text"
                      value={config.limite_credito_default}
                      onChange={(e) => handleChange('limite_credito_default', e.target.value)}
                    />
                    <Input
                      label="Tasa Mora Default (% mensual)"
                      type="number"
                      value={config.tasa_mora_default}
                      onChange={(e) => handleChange('tasa_mora_default', e.target.value)}
                      min={0}
                      max={100}
                      step={0.1}
                    />
                    <Input
                      label="Costo Carreta Default (S/)"
                      type="number"
                      value={config.costo_carreta_default}
                      onChange={(e) => handleChange('costo_carreta_default', Number(e.target.value))}
                      min={0}
                      step={0.01}
                    />
                    <div className="md:col-span-2 pt-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.incluir_carreta_default}
                          onChange={(e) => handleChange('incluir_carreta_default', e.target.checked)}
                          className="h-5 w-5 text-brand-ink border-gray-300 rounded focus:ring-brand-primary"
                        />
                        <span className="text-sm font-medium text-gray-700">Incluir carreta por defecto</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notificaciones' && (
                <div className="max-w-3xl space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Configuración de Notificaciones</h2>
                  <div className="space-y-4">
                    {[
                      { key: 'notificaciones_stock_bajo', label: 'Alertas de Stock Bajo', desc: 'Notificar cuando productos alcancen stock mínimo' },
                      { key: 'notificaciones_cotizaciones_vencidas', label: 'Cotizaciones Vencidas / Pendientes', desc: 'Alertar sobre cotizaciones próximas a vencer' },
                      { key: 'notificaciones_email', label: 'Resumen Diario de Ventas por Email', desc: 'Enviar un resumen diario de ventas por email' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                        <div>
                          <p className="font-semibold text-gray-900">{label}</p>
                          <p className="text-sm text-gray-500">{desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config[key as keyof Configuracion] as boolean}
                            onChange={(e) => handleChange(key as keyof Configuracion, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'sistema' && (
                <div className="max-w-3xl space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Configuración del Sistema</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--color-brand-ink)' }}>Tema</label>
                      <Select
                        value={config.tema}
                        onChange={(e) => handleChange('tema', String(e.target.value) as 'claro' | 'oscuro' | 'sistema')}
                        options={TEMA_OPTIONS}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--color-brand-ink)' }}>Idioma</label>
                      <Select
                        value={config.idioma}
                        onChange={(e) => handleChange('idioma', String(e.target.value))}
                        options={IDIOMA_OPTIONS}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.backup_automatico}
                          onChange={(e) => handleChange('backup_automatico', e.target.checked)}
                          className="h-5 w-5 text-brand-ink border-gray-300 rounded focus:ring-brand-primary"
                        />
                        <span className="text-sm font-medium text-gray-700">Backup automático diario</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Zona de Peligro</h3>
                    <div className="flex items-center justify-between p-4 bg-estado-rechazado-soft border border-estado-rechazado/30 rounded-xl">
                      <div>
                        <p className="font-semibold text-red-800">Restablecer Configuración</p>
                        <p className="text-sm text-red-600">Volver a los valores por defecto del sistema</p>
                      </div>
                      <Button variant="danger">
                        Restablecer
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-6 border-t border-gray-100">
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="px-3 py-1 text-sm font-medium bg-estado-aprobado-soft text-estado-aprobado-text rounded-full flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Guardado
                  </span>
                )}
                <Button onClick={handleSave} loading={loading} disabled={loading} variant="primary" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}