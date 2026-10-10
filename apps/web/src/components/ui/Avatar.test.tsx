import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders image with alt from nombre', () => {
    render(<Avatar src="https://example.com/avatar.jpg" nombre="Usuario Uno" />);
    const img = screen.getByAltText('Usuario Uno');
    expect(img).toHaveAttribute('src', expect.stringContaining('example.com'));
  });

  it('applies rounded-full to the container', () => {
    render(<Avatar src="https://example.com/avatar.jpg" nombre="Usuario Uno" title="Avatar" />);
    expect(screen.getByTitle('Avatar')).toHaveClass('rounded-full');
  });

  it('renders initials when no src', () => {
    render(<Avatar nombre="Juan Pérez" />);
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('renders default initial U when nombre is empty', () => {
    render(<Avatar nombre="" />);
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('renders first 2 initials for multiple names', () => {
    render(<Avatar nombre="María José García" />);
    expect(screen.getByText('MJ')).toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { rerender } = render(<Avatar size="xs" nombre="Test" />);
    expect(screen.getByText('T')).toHaveClass('h-7', 'w-7');

    rerender(<Avatar size="sm" nombre="Test" />);
    expect(screen.getByText('T')).toHaveClass('h-8', 'w-8');

    rerender(<Avatar size="md" nombre="Test" />);
    expect(screen.getByText('T')).toHaveClass('h-9', 'w-9');

    rerender(<Avatar size="lg" nombre="Test" />);
    expect(screen.getByText('T')).toHaveClass('h-12', 'w-12');

    rerender(<Avatar size="xl" nombre="Test" />);
    expect(screen.getByText('T')).toHaveClass('h-24', 'w-24');
  });

  it('shows fallback initials when image fails', () => {
    render(<Avatar src="https://example.com/broken.jpg" nombre="Test User" />);
    const img = screen.getByAltText('Test User');
    fireEvent.error(img);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Avatar className="custom-avatar" nombre="Test" />);
    expect(screen.getByText('T')).toHaveClass('custom-avatar');
  });

  it('renders as button when onClick provided', () => {
    const handleClick = vi.fn();
    render(<Avatar nombre="Test User" onClick={handleClick} title="Abrir perfil" />);
    const btn = screen.getByTitle('Abrir perfil');
    expect(btn.tagName).toBe('BUTTON');
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
