import { useEffect, useState } from 'react';

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
 * Botão de exclusão com confirmação em linha.
 *
 * Evita `window.confirm`: a confirmação fica visível no próprio fluxo da tela
 * e o erro da API aparece no estado da seção, sem diálogo do navegador.
 */
export function DeleteButton({ label = 'Excluir', onConfirm }: DeleteButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={deleteButtonClass('danger')}>
        {label}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
        className={deleteButtonClass('confirm')}
      >
        Confirmar
      </button>{' '}
      <button type="button" onClick={() => setArmed(false)} className={deleteButtonClass('cancel')}>
        Cancelar
      </button>
    </>
  );
}
