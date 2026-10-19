import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders children with card styles', () => {
    render(<Card>Card content</Card>);
    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-surface', 'rounded-2xl', 'shadow-card', 'overflow-hidden', 'transition-[box-shadow]', 'duration-150', 'hover:shadow-card-hover');
  });

  it('applies custom className', () => {
    render(<Card className="custom-card">Content</Card>);
    expect(screen.getByText('Content')).toHaveClass('custom-card');
  });
});

describe('CardHeader', () => {
  it('renders children with header styles', () => {
    render(<CardHeader>Header content</CardHeader>);
    const header = screen.getByText('Header content');
    expect(header).toHaveClass('px-6', 'py-4', 'border-b', 'border-border-default');
  });

  it('applies custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    expect(screen.getByText('Header')).toHaveClass('custom-header');
  });
});

describe('CardContent', () => {
  it('renders children with content styles', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toHaveClass('px-6', 'py-4');
  });
});

describe('CardFooter', () => {
  it('renders children with footer styles', () => {
    render(<CardFooter>Footer content</CardFooter>);
    const footer = screen.getByText('Footer content');
    expect(footer).toHaveClass('px-6', 'py-4', 'border-t', 'border-border-default', 'bg-surface-muted/50');
  });
});
