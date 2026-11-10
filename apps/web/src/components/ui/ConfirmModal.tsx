'use client';

import { ReactNode } from 'react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'outline';
}

export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  variant = 'danger',
}: ConfirmModalProps) => (
  <Modal
    open={open}
    onClose={onClose}
    closeDisabled={loading}
    title={title}
    maxWidth="sm"
    footer={
      <ModalFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={variant}
          onClick={() => void onConfirm()}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    }>
    <div className="text-left">
      <div className="text-sm text-brand-subtitle leading-relaxed">{message}</div>
    </div>
  </Modal>
);
