import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, BadgeVariant } from './Badge';

describe('Badge', () => {
  it('renderiza children', () => {
    render(<Badge>Aprobada</Badge>);
    expect(screen.getByText('Aprobada')).toBeInTheDocument();
  });

  it('size estado usa cápsula redondeada en mayúsculas', () => {
    render(
      <Badge variant="aprobado" size="estado">
        Aprobada
      </Badge>,
    );
    const el = screen.getByText('Aprobada');
    expect(el).toHaveClass('rounded-full');
    expect(el).toHaveClass('uppercase');
  });

  it('size xl usa pill grande', () => {
    render(
      <Badge variant="enviado" size="xl">
        Enviada
      </Badge>,
    );
    expect(screen.getByText('Enviada')).toHaveClass('h-9');
  });

  it('variant desconocido cae a neutral sin romperse', () => {
    render(<Badge variant={'inexistente' as BadgeVariant}>X</Badge>);
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
