import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

describe('Modal', () => {
  it('renders when open', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
        <ModalFooter>
          <Button variant="primary" onClick={() => {}}>Confirmar</Button>
          <Button variant="secondary" onClick={() => {}}>Cancelar</Button>
        </ModalFooter>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on overlay click', async () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    // Click on the overlay (backdrop), not the dialog
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    await waitFor(() => expect(handleClose).toHaveBeenCalled());
  });

  it('closes on Escape key', async () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(handleClose).toHaveBeenCalled());
  });

  it('does not close when clicking inside', async () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('Modal content'));
    await waitFor(() => expect(handleClose).not.toHaveBeenCalled());
  });

  it('renders footer actions', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
        <ModalFooter>
          <Button variant="primary" onClick={() => {}}>Confirmar</Button>
          <Button variant="secondary" onClick={() => {}}>Cancelar</Button>
        </ModalFooter>
      </Modal>
    );
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });
});