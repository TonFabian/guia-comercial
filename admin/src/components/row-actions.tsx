interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="h-8 rounded-[--radius-input] border border-border bg-surface-hover px-2 text-xs text-text"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="h-8 rounded-[--radius-input] border border-danger/30 bg-danger/10 px-2 text-xs text-danger"
      >
        Excluir
      </button>
    </span>
  );
}
