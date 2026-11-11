import { useState } from 'react';

import { ConfirmDialog } from './ui/confirm-dialog';

export type DeleteButtonVariant = 'danger' | 'confirm' | 'cancel';

/**
 * Classes dos estados do botão de exclusão (confirmação inline).
 * - danger: acento vermelho, hover preenchido.
 * - confirm: preenchimento sólido (ação confirmada).
 * - cancel: neutro de superfície.
 */
export function deleteButtonClass(variant: DeleteButtonVariant): string {
  const base =
    'h-8 rounded-[--radius-input] px-3 text-xs font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2';
  if (variant === 'danger') {
    return `${base} border border-danger/40 bg-danger/10 text-danger hover:border-danger hover:bg-danger hover:text-white focus-visible:ring-danger/50`;
  }
  if (variant === 'confirm') {
    return `${base} border border-danger/40 bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/50`;
  }
  return `${base} border border-border bg-surface-hover text-text hover:bg-surface hover:text-text focus-visible:ring-primary/50`;
}

export interface DeleteButtonProps {
  /** Rótulo do botão inicial (padrão: "Excluir"). */
  label?: string;
  onConfirm: () => void;
}

/**
 * Botão de exclusão com confirmação em modal customizado.
 *
 * Dupla confirmação: 1º clique abre o modal (Tailwind puro, sem
 * window.confirm); a exclusão só ocorre no "Confirmar" do modal. Erros da
 * API aparecem no estado da seção, sem diálogo do navegador.
 */
export function DeleteButton({ label = 'Excluir', onConfirm }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={deleteButtonClass('danger')}>
        {label}
      </button>
      <ConfirmDialog
        open={open}
        title="Excluir registro"
        message="Esta ação é permanente e não pode ser desfeita. Deseja realmente excluir este registro?"
        confirmLabel="Confirmar"
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
