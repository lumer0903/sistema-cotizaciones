'use client';

import { Input, Select } from '@/components/ui';
import { ClienteAutocomplete } from '@/features/cotizaciones/components/ClienteAutocomplete';

const formatearRuc = (
  prev: string,
  tipo: 'DNI' | 'CE' | 'RUC',
  raw: string,
  max: number
): string => {
  if (tipo === 'CE') {
    return prev.slice(0, max);
  }
  const numeric = raw.replace(/\D/g, '');
  return numeric.slice(0, max);
};

interface ClienteSectionProps {
  setNombre: (v: string) => void;
  setIdCliente: (c: number | null) => void;
  setClienteEditado: (v: boolean) => void;
  idCliente: number | null;
  _clienteEditado: boolean;
  nombre: string;
  telefono: string;
  setTelefono: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  tipoDocumento: 'DNI' | 'CE' | 'RUC';
  setTipoDocumento: (v: 'DNI' | 'CE' | 'RUC') => void;
  rucDni: string;
  setRucDni: (v: string) => void;
  maxDocLength: number;
  docLabel: string;
  docSoloNumeros: boolean;
}

export const ClienteSection: React.FC<ClienteSectionProps> = ({
  setNombre,
  setIdCliente,
  setClienteEditado,
  idCliente,
  _clienteEditado,
  nombre,
  telefono,
  setTelefono,
  email,
  setEmail,
  tipoDocumento,
  setTipoDocumento,
  rucDni,
  setRucDni,
  maxDocLength,
  docLabel,
  docSoloNumeros,
}) => {
  const handleOnSelectCliente = ((c: any) => {
    if (!c) {
      setIdCliente(null);
      setClienteEditado(false);
      return;
    }
    setIdCliente(c.id_cliente);
    setNombre(c.nombre || '');
    setTelefono((c.telefono || '').replace(/\D/g, '').slice(0, 9));
    setEmail(c.email || '');
    setRucDni((c.ruc_dni || '').trim());
  }) as (c: import('@/features/cotizaciones/components/ClienteAutocomplete').Cliente | null) => void;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <ClienteAutocomplete
        value={nombre}
        onChange={setNombre}
        onSelectCliente={handleOnSelectCliente}
      />
      <Input
        label="Teléfono"
        placeholder="Teléfono de contacto"
        value={telefono}
        maxLength={9}
        inputMode="numeric"
        onChange={(e) => {
          setTelefono(e.target.value.replace(/\D/g, '').slice(0, 9));
          if (idCliente) setClienteEditado(true);
        }}
      />
      <Input
        label="Email"
        type="email"
        placeholder="correo@ejemplo.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (idCliente) setClienteEditado(true);
        }}
      />
      <Select
        label="Tipo de Documento"
        variant="modal"
        value={tipoDocumento}
        onChange={(e) => {
          const v = String(getSelectValue(e)) as 'DNI' | 'CE' | 'RUC';
          setTipoDocumento(v);
          const max = v === 'DNI' ? 8 : v === 'RUC' ? 11 : 12;
          const raw = String(e?.target?.value || '');
          setRucDni(formatearRuc(rucDni, v, raw, max));
          if (idCliente) setClienteEditado(true);
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
        value={rucDni}
        maxLength={maxDocLength}
        inputMode={docSoloNumeros ? 'numeric' : 'text'}
        onChange={(e) => {
          const raw = String(e.target?.value || '');
          const filtrado = docSoloNumeros ? raw.replace(/\D/g, '').slice(0, maxDocLength) : raw.slice(0, maxDocLength);
          setRucDni(filtrado);
          if (idCliente) setClienteEditado(true);
        }}
      />
      <Input
        label="Fecha de vencimiento"
        type="date"
        value={nombre}
        onChange={(_e) => {}}
      />
    </div>
  );
};

const getSelectValue = (e: any) => (e && e.target ? e.target.value : e);