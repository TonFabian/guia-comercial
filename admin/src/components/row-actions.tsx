import { useState } from 'react';

import { ConfirmDialog } from './ui/confirm-dialog';

export type RowActionVariant = 'edit' | 'delete';

/**
 * Classes dos botões de ação da tabela (Editar/Excluir).
 * - Editar: acento primário (amber) com hover preenchido.
 * - Excluir: danger (vermelho) com hover preenchido.
 * Ambos com transição suave, elevação leve no hover e feedback de clique.
 */
export function rowActionClass(variant: RowActionVariant): string {
  const base =
    'h-9 flex-1 rounded-(--radius-input) px-3 text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 hover:shadow-(--shadow-card) active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 sm:h-8 sm:flex-none';
  if (variant === 'edit') {
    return `${base} border border-primary/40 bg-surface-hover text-primary hover:border-primary hover:bg-primary hover:text-[#111827] focus-visible:ring-primary/50`;
  }
  return `${base} border border-danger/40 bg-danger/10 text-danger hover:border-danger hover:bg-danger hover:text-white focus-visible:ring-danger/50`;
}

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  // Dupla confirmação: 1º clique abre o modal; a exclusão só ocorre no
  // "Confirmar" do modal (nunca no clique da tabela).
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <span className="flex flex-1 gap-2 sm:inline-flex sm:flex-none">
        <button type="button" onClick={onEdit} className={rowActionClass('edit')}>
          Editar
        </button>
        <button type="button" onClick={() => setConfirming(true)} className={rowActionClass('delete')}>
          Excluir
        </button>
      </span>
      <ConfirmDialog
        open={confirming}
        title="Excluir registro"
        message="Esta ação é permanente e não pode ser desfeita. Deseja realmente excluir este registro?"
        confirmLabel="Confirmar"
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
