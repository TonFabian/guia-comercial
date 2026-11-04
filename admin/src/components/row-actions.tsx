import { Fragment } from 'react';

import { DeleteButton } from './delete-button';

export interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

/** Ações padrão das linhas: editar e excluir (com confirmação em linha). */
export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <Fragment>
      <button type="button" onClick={onEdit}>
        Editar
      </button>{' '}
      <DeleteButton onConfirm={onDelete} />
    </Fragment>
  );
}
