import { useState } from 'react';
import { X, DollarSign, CreditCard, Smartphone, Banknote, Send } from 'lucide-react';
import { apiJson } from '../../infrastructure/http/apiClient';
import { money } from '../utils/format';

const METODOS = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'transferencia', label: 'Transferencia', icon: Banknote },
  { value: 'tarjeta_credito', label: 'Tarjeta Crédito', icon: CreditCard },
  { value: 'tarjeta_debito', label: 'Tarjeta Débito', icon: CreditCard },
  { value: 'yape_plin', label: 'Yape/Plin', icon: Smartphone },
  { value: 'mixto', label: 'Mixto', icon: DollarSign }
];

export function PagoModal({ cuenta, onClose, onSuccess }) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [monto, setMonto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const montoPendiente = Number(cuenta.montoPendiente || 0);
  const montoMax = montoPendiente;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const montoNum = Number(monto);
    
    if (!montoNum || montoNum <= 0) {
      setError('Ingrese un monto válido');
      return;
    }
    if (montoNum > montoMax) {
      setError(`El monto no puede exceder lo pendiente (${money(montoMax)})`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiJson(`/api/ventas/${cuenta.id_venta}/pagos`, {
        method: 'POST',
        body: JSON.stringify({
          monto: montoNum,
          metodoPago,
          referencia: referencia.trim() || undefined
        })
      });
      onSuccess();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (!cuenta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
      <div onClick={onClose} className="absolute inset-0" />
      <div className="relative w-full max-w-md rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-xl animate-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#414141]">Registrar Pago</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-[#f8fafc] hover:text-[#414141] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="rounded-xl border border-[#d9d9d9] bg-[#f8fafc] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Venta</span>
              <span className="font-semibold text-[#414141]">{cuenta.venta?.numero_completo || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-neutral-400">Cliente</span>
              <span className="font-semibold text-[#414141]">{cuenta.cliente?.nombre || 'Sin cliente'}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-neutral-400">Vencimiento</span>
              <span className="font-semibold text-[#414141]">{new Date(cuenta.fechaVencimiento).toLocaleDateString('es-PE')}</span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#d9d9d9]/50">
              <span className="text-sm text-neutral-400">Monto Pendiente</span>
              <span className="text-lg font-bold text-[#414141]">{money(montoPendiente)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs font-semibold text-red-650">
                {error}
              </div>
            )}

            {/* Método de Pago */}
            <div>
              <label className="block text-xs font-semibold text-[#414141] mb-2">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {METODOS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetodoPago(m.value)}
                    className={`relative rounded-xl border-2 p-3 text-center transition-all ${
                      metodoPago === m.value
                        ? 'border-[#7b1c1c] bg-[#fdf2f2] text-[#7b1c1c]'
                        : 'border-[#d9d9d9] bg-white text-neutral-500 hover:border-[#7b1c1c]/50 hover:text-[#7b1c1c]'
                    }`}
                  >
                    <m.icon className="mx-auto h-5 w-5 mb-1" />
                    <span className="block text-[10px] font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-xs font-semibold text-[#414141] mb-2">
                Monto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <DollarSign className="h-4 w-4" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={montoMax}
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder={`Máx. ${money(montoMax)}`}
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">Pendiente: {money(montoPendiente)}</p>
            </div>

            {/* Referencia */}
            <div>
              <label className="block text-xs font-semibold text-[#414141] mb-2">Referencia (opcional)</label>
              <input
                type="text"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                placeholder="N° operación, comprobante, etc."
                className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-4 text-xs placeholder-neutral-400 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
              />
            </div>
          </form>
        </div>

        <div className="flex gap-3 pt-4 border-t border-[#d9d9d9]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-[#d9d9d9] bg-white py-2.5 text-sm font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="pago-form"
            disabled={loading || !monto}
            className="flex-1 rounded-xl bg-[#7b1c1c] py-2.5 text-sm font-semibold text-white hover:bg-[#60141c] shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Registrar Pago
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}