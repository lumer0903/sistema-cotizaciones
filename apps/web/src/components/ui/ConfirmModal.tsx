'use client';

import { ReactNode } from 'react';
import { Modal } from './Modal';
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
}: ConfirmModalProps) => (
  <Modal
    open={open}
    onClose={loading ? () => undefined : onClose}
    title={title}
    maxWidth="sm"
  >
    <div className="space-y-5">
      <div className="text-sm text-brand-subtitle leading-relaxed">{message}</div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button type="button" variant="danger" onClick={() => void onConfirm()} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
