import { useEffect, useState } from 'react';

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
      <button type="button" onClick={() => setArmed(true)}>
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
      >
        Confirmar
      </button>{' '}
      <button type="button" onClick={() => setArmed(false)}>
        Cancelar
      </button>
    </>
  );
}
