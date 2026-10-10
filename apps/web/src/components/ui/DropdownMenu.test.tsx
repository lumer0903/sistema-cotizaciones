import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu';

const renderMenu = (items: DropdownMenuItem[] = [{ key: '1', label: 'Opción 1', onClick: vi.fn() }]) =>
  render(
    <DropdownMenu
      items={items}
      label="Menú"
      triggerAriaLabel="Abrir menú"
      trigger={<span>Menú</span>}
    />
  );

describe('DropdownMenu', () => {
  it('renders trigger button with aria attributes', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Abrir menú' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens dropdown on click', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    expect(screen.getByRole('menu')).toHaveAttribute('aria-label', 'Menú');
  });

  it('renders menu items', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(await screen.findByRole('menuitem', { name: 'Opción 1' })).toBeInTheDocument();
  });

  it('calls onClick when item clicked', async () => {
    const handleClick = vi.fn();
    renderMenu([{ key: '1', label: 'Opción 1', onClick: handleClick }]);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Opción 1' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('closes on item click', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await screen.findByRole('menu');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Opción 1' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('shows divider before item with dividerBefore', async () => {
    renderMenu([
      { key: '1', label: 'Opción 1', onClick: vi.fn() },
      { key: '2', label: 'Opción 2', onClick: vi.fn(), dividerBefore: true },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await screen.findByRole('menu');
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('shows danger style for danger items', async () => {
    renderMenu([{ key: '1', label: 'Eliminar', onClick: vi.fn(), danger: true }]);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(await screen.findByRole('menuitem', { name: 'Eliminar' })).toHaveClass('text-danger');
  });

  it('shows badge on item', async () => {
    renderMenu([{ key: '1', label: 'Alertas', onClick: vi.fn(), badge: 5 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(await screen.findByRole('menuitem', { name: /Alertas/ })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('caps badge at 9+', async () => {
    renderMenu([{ key: '1', label: 'Alertas', onClick: vi.fn(), badge: 12 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await screen.findByRole('menuitem', { name: /Alertas/ });
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('does not render badge when zero', async () => {
    renderMenu([{ key: '1', label: 'Alertas', onClick: vi.fn(), badge: 0 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await screen.findByRole('menuitem', { name: /Alertas/ });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('closes on Escape key and returns focus to trigger', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Abrir menú' });
    fireEvent.click(trigger);
    await screen.findByRole('menu');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('does not render disabled item as enabled', async () => {
    renderMenu([{ key: '1', label: 'Inactivo', onClick: vi.fn(), disabled: true }]);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(await screen.findByRole('menuitem', { name: 'Inactivo' })).toBeDisabled();
  });
});
