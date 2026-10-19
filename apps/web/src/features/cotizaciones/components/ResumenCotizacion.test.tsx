import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ResumenCotizacionPage from '@/app/(dashboard)/cotizaciones/crear/resumen/page';
import { useCrearCotizacionStore } from '../store/useCrearCotizacionStore';
import * as api from '../api/cotizacionApi';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/lib/toast', () => ({ showToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../api/cotizacionApi', () => ({
  getCotizacionDetalle: vi.fn(), actualizarCotizacion: vi.fn(), cambiarEstadoCotizacion: vi.fn(),
  crearCliente: vi.fn(), actualizarCliente: vi.fn(), crearCotizacion: vi.fn(), exportarPdfCotizacion: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useCrearCotizacionStore.getState().reset();
  useCrearCotizacionStore.setState({ numeroCotizacion: 'COT-5', numeroGuardado: 'COT-5', idCotizacionGuardada: 5, editandoId: 5,
    cliente: { id_cliente: 1, nombre: 'Cliente', telefono: '', email: '', tipoDocumento: 'DNI', ruc_dni: '', clienteEditado: false },
    items: [{ id: '1', id_producto: 1, codigo: 'P1', descripcion: 'Producto', cantidad: 1, precioUnitario: 10, total: 10 }],
  });
  vi.mocked(api.actualizarCotizacion).mockResolvedValue({});
  vi.mocked(api.cambiarEstadoCotizacion).mockResolvedValue({});
});

describe('resumen de cotización', () => {
  it('una cotización enviada no permite guardar cambios ni cambiar observaciones', async () => {
    vi.mocked(api.getCotizacionDetalle).mockResolvedValue({ id_cotizacion: 5, estado: 'enviada', observaciones: 'Original' });
    render(<ResumenCotizacionPage />);
    await screen.findByDisplayValue('Original');
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(api.actualizarCotizacion).not.toHaveBeenCalled();
  });

  it('elegir ENVIADO guarda el detalle antes de cambiar el estado', async () => {
    vi.mocked(api.getCotizacionDetalle).mockResolvedValue({ id_cotizacion: 5, estado: 'borrador', observaciones: 'Original' });
    render(<ResumenCotizacionPage />);
    await screen.findByRole('button', { name: 'Guardar cambios' });
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'ENVIADO' }));
    expect(api.cambiarEstadoCotizacion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(api.cambiarEstadoCotizacion).toHaveBeenCalledWith(5, 'enviada'));
    expect(vi.mocked(api.actualizarCotizacion).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(api.cambiarEstadoCotizacion).mock.invocationCallOrder[0]);
  });
});
