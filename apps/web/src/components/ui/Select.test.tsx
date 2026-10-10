import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

const options = [
  { label: 'Opción 1', value: '1' },
  { label: 'Opción 2', value: '2' },
];

describe('Select', () => {
  it('renders with label linked to the combobox', () => {
    render(<Select label="Categoría" options={options} />);
    expect(screen.getByLabelText('Categoría')).toHaveAttribute('role', 'combobox');
  });

  it('renders placeholder when no value', () => {
    render(<Select options={options} placeholder="Seleccionar" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Seleccionar');
  });

  it('opens listbox on click and renders options', () => {
    render(<Select label="Categoría" options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Opción 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Opción 2' })).toBeInTheDocument();
  });

  it('selects option on click and calls onChange', () => {
    const handleChange = vi.fn();
    render(<Select options={options} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Opción 2' }));
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '2', name: undefined } }));
    expect(screen.getByRole('combobox')).toHaveTextContent('Opción 2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows selected value from value prop', () => {
    render(<Select options={options} value="2" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Opción 2');
  });

  it('shows check icon on selected option', () => {
    render(<Select options={options} value="1" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Opción 1' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Opción 2' })).toHaveAttribute('aria-selected', 'false');
  });

  it('applies disabled state', () => {
    render(<Select options={options} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('does not open when disabled', () => {
    render(<Select options={options} disabled />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<Select options={options} error="Campo obligatorio" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obligatorio');
  });

  it('renders options from children', () => {
    render(
      <Select>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </Select>
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
  });
});
