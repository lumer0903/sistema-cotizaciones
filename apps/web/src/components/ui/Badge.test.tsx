import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, StatusBadge } from './Badge';

describe('Badge', () => {
  it('renders children with pill styles by default', () => {
    render(<Badge variant="brand">Marca</Badge>);
    const badge = screen.getByText('Marca');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-accent-selection', 'rounded-md', 'border');
  });

  it('renders success variant with status styles', () => {
    render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText('OK')).toHaveClass('bg-status-aprobado-soft', 'text-status-aprobado-text');
  });

  it('renders danger variant with status styles', () => {
    render(<Badge variant="danger">Error</Badge>);
    expect(screen.getByText('Error')).toHaveClass('bg-status-rechazado-soft');
  });

  it('renders tienda variant as plain text', () => {
    render(<Badge variant="tienda">Tienda</Badge>);
    const badge = screen.getByText('Tienda');
    expect(badge).toHaveClass('text-role-tienda', 'font-bold', 'uppercase');
    expect(badge).not.toHaveClass('bg-role-tienda-soft');
  });

  it('renders distribuidor variant as plain text', () => {
    render(<Badge variant="distribuidor">Distri</Badge>);
    const badge = screen.getByText('Distri');
    expect(badge).toHaveClass('text-role-distribuidor', 'font-bold', 'uppercase');
    expect(badge).not.toHaveClass('bg-role-distribuidor-soft');
  });

  it('renders tienda as pill in size estado', () => {
    render(<Badge variant="tienda" size="estado">Tienda</Badge>);
    expect(screen.getByText('Tienda')).toHaveClass('bg-role-tienda-soft', 'uppercase');
  });

  it('renders plain-text variant without background', () => {
    render(<Badge variant="vendedor">Vendedor</Badge>);
    const badge = screen.getByText('Vendedor');
    expect(badge).toHaveClass('text-vendedor-ink', 'font-semibold');
    expect(badge).not.toHaveClass('rounded-md');
  });

  it('renders size xl with capsule styles', () => {
    render(<Badge variant="aprobado" size="xl">Aprobado</Badge>);
    const badge = screen.getByText('Aprobado');
    expect(badge).toHaveClass('h-9', 'px-4', 'rounded-lg', 'text-base', 'font-bold', 'bg-status-aprobado-soft');
  });

  it('renders size estado with uppercase capsule', () => {
    render(<Badge variant="enviado" size="estado">Enviado</Badge>);
    const badge = screen.getByText('Enviado');
    expect(badge).toHaveClass('uppercase', 'tracking-wider', 'rounded-full', 'bg-status-enviado-soft');
  });

  it('falls back to neutral styles for unknown variant in size xl', () => {
    render(<Badge variant="neutral" size="xl">Neutro</Badge>);
    expect(screen.getByText('Neutro')).toHaveClass('bg-status-borrador');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Test</Badge>);
    expect(screen.getByText('Test')).toHaveClass('custom-class');
  });
});

describe('StatusBadge', () => {
  it('renders estado capsule', () => {
    render(<StatusBadge variant="aprobado">Aprobado</StatusBadge>);
    const badge = screen.getByText('Aprobado');
    expect(badge).toHaveClass('uppercase', 'bg-status-aprobado-soft');
  });
});
