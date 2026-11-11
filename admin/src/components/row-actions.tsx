interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <span className="flex flex-1 gap-2 sm:inline-flex sm:flex-none">
      <button
        type="button"
        onClick={onEdit}
        className="h-9 flex-1 rounded-[--radius-input] border border-border bg-surface-hover px-3 text-xs text-text sm:h-8 sm:flex-none"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="h-9 flex-1 rounded-[--radius-input] border border-danger/30 bg-danger/10 px-3 text-xs text-danger sm:h-8 sm:flex-none"
      >
        Excluir
      </button>
    </span>
  );
}
