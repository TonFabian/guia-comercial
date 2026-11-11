import { useEffect } from 'react';

import { deleteButtonClass } from '../delete-button';

export interface ConfirmDialogProps {
  open: boolean;
  /** Título do modal (ex.: "Excluir empresa"). */
  title?: string;
  /** Texto explicativo da consequência. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmação para ações destrutivas (Tailwind puro, sem
 * window.confirm/alert). A ação só executa após o clique explícito em
 * "Confirmar"; Escape, backdrop e "Cancelar" sempre abortam.
 */
export function ConfirmDialog({
  open,
  title = 'Confirmar ação',
  message = 'Esta ação é permanente e não pode ser desfeita. Deseja realmente continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Escape cancela — destrutivo só sai pelo clique explícito em Confirmar.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[--radius-card] border border-border bg-surface p-5 shadow-[--shadow-card]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {title}
        </h2>
        <p className="mt-2 text-sm text-text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={deleteButtonClass('cancel')}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={deleteButtonClass('confirm')}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
