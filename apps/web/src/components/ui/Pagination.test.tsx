import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';

const defaultProps = {
  currentPage: 1,
  totalPages: 5,
  totalItems: 100,
  limit: 16,
  onPageChange: vi.fn(),
  onLimitChange: vi.fn(),
};

describe('Pagination', () => {
  it('renders pagination controls', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument();
    expect(screen.getByText('Mostrar')).toBeInTheDocument();
    expect(screen.getByText('registros por página')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('enables both arrows on middle page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled();
  });

  it('calls onPageChange when page clicked', () => {
    const handlePageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={handlePageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when next clicked', () => {
    const handlePageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={2} onPageChange={handlePageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('shows correct item range', () => {
    render(<Pagination {...defaultProps} currentPage={2} />);
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows ellipsis for many pages', () => {
    render(<Pagination {...defaultProps} currentPage={5} totalPages={10} totalItems={200} />);
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });

  it('marks current page with aria-current', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    expect(screen.getByRole('button', { name: 'Página 3' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders all page buttons when few pages', () => {
    render(<Pagination {...defaultProps} totalPages={4} />);
    expect(screen.getByRole('button', { name: 'Página 4' })).toBeInTheDocument();
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });
});
