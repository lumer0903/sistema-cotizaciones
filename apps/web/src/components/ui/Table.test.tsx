import type React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './Table';
import { Pagination as TablePagination } from './Pagination';

const mockData = [
  { id: 1, name: 'Juan', email: 'juan@test.com', active: true },
  { id: 2, name: 'María', email: 'maria@test.com', active: false },
  { id: 3, name: 'Pedro', email: 'pedro@test.com', active: true },
];

const renderTable = (props: Partial<React.ComponentProps<typeof Table>> = {}) =>
  render(
    <Table {...props}>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Activo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mockData.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.id}</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{item.active ? 'Sí' : 'No'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

describe('Table', () => {
  it('renders table with headers inside accessible region', () => {
    renderTable();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tabla' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Juan' })).toBeInTheDocument();
  });

  it('renders rows with all cells', () => {
    renderTable();
    expect(screen.getAllByRole('row')).toHaveLength(mockData.length + 1);
  });

  it('applies custom class to table', () => {
    renderTable({ className: 'custom-table' });
    expect(screen.getByRole('table')).toHaveClass('custom-table');
  });

  it('applies custom wrapperClassName to scroll region', () => {
    renderTable({ wrapperClassName: 'custom-wrapper' });
    expect(screen.getByRole('region', { name: 'Tabla' })).toHaveClass('custom-wrapper');
  });

  it('makes row clickable with role button', () => {
    const handleClick = vi.fn();
    render(
      <Table>
        <TableBody>
          <TableRow onClick={handleClick}>
            <TableCell>Fila</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const row = screen.getByRole('button', { name: 'Fila' });
    fireEvent.click(row);
    expect(handleClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('applies sticky classes to header when sticky', () => {
    render(
      <Table>
        <TableHeader sticky>
          <TableRow>
            <TableHead>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>1</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const table = screen.getByRole('table');
    const thead = table.querySelector('thead');
    expect(thead?.className).toContain('[&>tr>th]:sticky');
  });
});

describe('TablePagination (Pagination)', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 100,
    limit: 16,
    onPageChange: vi.fn(),
    onLimitChange: vi.fn(),
  };

  it('renders pagination controls', () => {
    render(<TablePagination {...defaultProps} />);
    expect(screen.getByText('Mostrar')).toBeInTheDocument();
    expect(screen.getByText('registros por página')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 2' })).toBeInTheDocument();
  });

  it('disables previous on first page', () => {
    render(<TablePagination {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  });

  it('disables next on last page', () => {
    render(<TablePagination {...defaultProps} currentPage={5} />);
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('calls onPageChange when page clicked', () => {
    const handlePageChange = vi.fn();
    render(<TablePagination {...defaultProps} onPageChange={handlePageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('shows correct item range', () => {
    render(<TablePagination {...defaultProps} currentPage={2} />);
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
