'use client';
import { Card } from '@/components/ui/Card';

import { Input, Select } from '@/components/ui';
import { ClienteAutocomplete } from '@/features/cotizaciones/components/ClienteAutocomplete';
import type { Cliente } from '@/features/cotizaciones/components/ClienteAutocomplete';
import type { ClienteForm } from '@/features/cotizaciones/store/useCrearCotizacionStore';

export type ClienteFormState = ClienteForm;

export interface InformacionGeneralProps {
  cliente: ClienteFormState;
  onClienteChange: (patch: Partial<ClienteFormState>) => void;
  onSelectClienteExistente: (c: Cliente | null) => void;
  tipoPrecioCliente: 'DISTRIBUIDOR' | 'TIENDA';
  onTipoPrecioClienteChange: (v: 'DISTRIBUIDOR' | 'TIENDA') => void;
  fechaVencimiento: string;
  onFechaVencimientoChange: (v: string) => void;
  tipoPago: string;
  onTipoPagoChange: (v: string) => void;
}

/** Helper para manejar valores de Select sea evento u objeto directo */
const getSelectValue = (e: any) => (e && e.target ? e.target.value : e);

export function InformacionGeneral({
  cliente,
  onClienteChange,
  onSelectClienteExistente,
  tipoPrecioCliente,
  onTipoPrecioClienteChange,
  fechaVencimiento,
  onFechaVencimientoChange,
  tipoPago,
  onTipoPagoChange,
}: InformacionGeneralProps) {
  const { tipoDocumento, ruc_dni } = cliente;

  const maxDocLength = tipoDocumento === 'DNI' ? 8 : tipoDocumento === 'RUC' ? 11 : 12;
  const docSoloNumeros = tipoDocumento !== 'CE';
  const docLabel = tipoDocumento === 'DNI' ? 'N° DNI' : tipoDocumento === 'RUC' ? 'N° RUC' : 'N° Carnet Extranjería';

  /** Marca el cliente como editado si había uno seleccionado, para no pisar los datos del servidor */
  const marcarEditado = () => {
    if (cliente.id_cliente) onClienteChange({ clienteEditado: true });
  };

  return (
    <Card className="p-6 space-y-4 overflow-visible">
      <h2 className="text-lg font-bold text-zinc-700 mb-2">Información general</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <ClienteAutocomplete
          value={cliente.nombre}
          onChange={(v) => {
            onClienteChange({ nombre: v });
            if (cliente.id_cliente) onClienteChange({ clienteEditado: true });
          }}
          onSelectCliente={onSelectClienteExistente}
        />
        <Select
          label="Tipo de precio"
          variant="modal"
          value={tipoPrecioCliente}
          onChange={(e) => onTipoPrecioClienteChange(getSelectValue(e) as 'DISTRIBUIDOR' | 'TIENDA')}
          options={[
            { label: 'Distribuidor', value: 'DISTRIBUIDOR' },
            { label: 'Tienda', value: 'TIENDA' },
          ]}
        />
        <Input
          label="Teléfono"
          placeholder="Teléfono de contacto"
          value={cliente.telefono}
          maxLength={9}
          inputMode="numeric"
          onChange={(e) => {
            onClienteChange({ telefono: e.target.value.replace(/\D/g, '').slice(0, 9) });
            marcarEditado();
          }}
        />

        <Input
          label="Email"
          type="email"
          placeholder="correo@ejemplo.com"
          value={cliente.email}
          onChange={(e) => {
            onClienteChange({ email: e.target.value });
            marcarEditado();
          }}
        />
        <Select
          label="Tipo de Documento"
          variant="modal"
          value={tipoDocumento}
          onChange={(e) => {
            const v = String(getSelectValue(e)) as 'DNI' | 'CE' | 'RUC';
            const max = v === 'DNI' ? 8 : v === 'RUC' ? 11 : 12;
            onClienteChange({
              tipoDocumento: v,
              ruc_dni: v === 'CE' ? ruc_dni.slice(0, max) : ruc_dni.replace(/\D/g, '').slice(0, max),
            });
            marcarEditado();
          }}
          options={[
            { label: 'DNI', value: 'DNI' },
            { label: 'CE', value: 'CE' },
            { label: 'RUC', value: 'RUC' },
          ]}
        />
        <Input
          label={docLabel}
          placeholder={tipoDocumento === 'RUC' ? '11 dígitos' : tipoDocumento === 'DNI' ? '8 dígitos' : 'Documento'}
          value={ruc_dni}
          maxLength={maxDocLength}
          inputMode={docSoloNumeros ? 'numeric' : 'text'}
          onChange={(e) => {
            const raw = e.target.value;
            onClienteChange({
              ruc_dni: docSoloNumeros ? raw.replace(/\D/g, '').slice(0, maxDocLength) : raw.slice(0, maxDocLength),
            });
            marcarEditado();
          }}
        />
        <Input
          label="Fecha de vencimiento"
          type="date"
          value={fechaVencimiento}
          onChange={(e) => onFechaVencimientoChange(e.target.value)}
        />
        <Select
          label="Tipo de pago"
          variant="modal"
          value={tipoPago}
          onChange={(e) => onTipoPagoChange(String(getSelectValue(e)))}
          options={[
            { label: 'Contado', value: 'CONTADO' },
            { label: 'Crédito', value: 'CREDITO' },
          ]}
        />
      </div>
    </Card>
  );
}
