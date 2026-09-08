'use client';

import { Settings, User, Bell, Shield, Database, Palette, Key, Globe, Mail, Truck, CreditCard, Save, FileText } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { useEffect, useState } from 'react';

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

export default function AdminConfiguracionPage() {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(false);
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
    // Simular carga de configuración
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleChange = <K extends keyof Configuracion>(key: K, value: Configuracion[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500">Parámetros generales del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Guardado
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4 inline mr-2" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px min-w-max" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary-700 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-gray-200 rounded w-3/4" />
              ))}
            </div>
          ) : activeTab === 'empresa' && (
            <div className="max-w-3xl space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Datos de la Empresa</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    value={config.empresa_nombre}
                    onChange={(e) => handleChange('empresa_nombre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUC *</label>
                  <input
                    type="text"
                    value={config.empresa_ruc}
                    onChange={(e) => handleChange('empresa_ruc', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    maxLength={11}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={config.empresa_direccion}
                    onChange={(e) => handleChange('empresa_direccion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={config.empresa_telefono}
                    onChange={(e) => handleChange('empresa_telefono', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={config.empresa_email}
                    onChange={(e) => handleChange('empresa_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="max-w-3xl space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Configuración de Documentos</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={config.moneda}
                    onChange={(e) => handleChange('moneda', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="PEN">PEN - Soles</option>
                    <option value="USD">USD - Dólares</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IGV (%)</label>
                  <input
                    type="number"
                    value={config.igv_porcentaje}
                    onChange={(e) => handleChange('igv_porcentaje', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serie Boleta</label>
                  <input
                    type="text"
                    value={config.serie_boleta}
                    onChange={(e) => handleChange('serie_boleta', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serie Factura</label>
                  <input
                    type="text"
                    value={config.serie_factura}
                    onChange={(e) => handleChange('serie_factura', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correlativo Boleta</label>
                  <input
                    type="number"
                    value={config.correlativo_boleta}
                    onChange={(e) => handleChange('correlativo_boleta', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correlativo Factura</label>
                  <input
                    type="number"
                    value={config.correlativo_factura}
                    onChange={(e) => handleChange('correlativo_factura', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comercial' && (
            <div className="max-w-3xl space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Parámetros Comerciales</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.incluir_carreta_default}
                      onChange={(e) => handleChange('incluir_carreta_default', e.target.checked)}
                      className="h-4 w-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Incluir carreta por defecto</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo Carreta Default (S/)</label>
                  <input
                    type="number"
                    value={config.costo_carreta_default}
                    onChange={(e) => handleChange('costo_carreta_default', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días Vencimiento Default</label>
                  <input
                    type="number"
                    value={config.dias_vencimiento_default}
                    onChange={(e) => handleChange('dias_vencimiento_default', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    max="360"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Límite Crédito Default (S/)</label>
                  <input
                    type="text"
                    value={config.limite_credito_default}
                    onChange={(e) => handleChange('limite_credito_default', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tasa Mora Default (% mensual)</label>
                  <input
                    type="number"
                    value={config.tasa_mora_default}
                    onChange={(e) => handleChange('tasa_mora_default', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notificaciones' && (
            <div className="max-w-3xl space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Configuración de Notificaciones</h2>
              <div className="space-y-4">
                {[
                  { key: 'notificaciones_email', label: 'Notificaciones por Email', desc: 'Enviar emails automáticos para eventos importantes' },
                  { key: 'notificaciones_stock_bajo', label: 'Alertas de Stock Bajo', desc: 'Notificar cuando productos alcancen stock mínimo' },
                  { key: 'notificaciones_cotizaciones_vencidas', label: 'Cotizaciones Vencidas', desc: 'Alertar sobre cotizaciones próximas a vencer' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config[key as keyof Configuracion] as boolean}
                        onChange={(e) => handleChange(key as keyof Configuracion, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-700"></div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
                  <select
                    value={config.tema}
                    onChange={(e) => handleChange('tema', e.target.value as 'claro' | 'oscuro' | 'sistema')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="sistema">Sistema</option>
                    <option value="claro">Claro</option>
                    <option value="oscuro">Oscuro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                  <select
                    value={config.idioma}
                    onChange={(e) => handleChange('idioma', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.backup_automatico}
                      onChange={(e) => handleChange('backup_automatico', e.target.checked)}
                      className="h-4 w-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Backup automático diario</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Zona de Peligro</h3>
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <p className="font-medium text-red-800">Restablecer Configuración</p>
                    <p className="text-sm text-red-600">Volver a los valores por defecto del sistema</p>
                  </div>
                  <button className="px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-100 transition-colors">
                    Restablecer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper icon
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}