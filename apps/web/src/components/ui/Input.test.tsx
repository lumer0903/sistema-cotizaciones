import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" placeholder="email@ejemplo.com" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('email@ejemplo.com')).toBeInTheDocument();
  });

  it('renders with error', () => {
    render(<Input label="Email" error="Email inválido" />);
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders with icon', () => {
    const SearchIcon = () => <svg data-testid="search" />;
    render(<Input label="Buscar" icon={<SearchIcon />} />);
    expect(screen.getByTestId('search')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input value="test" onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies disabled state', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText('Disabled');
    expect(input).toBeDisabled();
  });

  it('renders required indicator', () => {
    render(<Input label="Required" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('applies error styles', () => {
    render(<Input error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('!border-danger');
  });
});