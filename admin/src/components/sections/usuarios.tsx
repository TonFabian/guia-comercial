import { useMemo, useState } from 'react';

import { useUser } from '@clerk/clerk-react';

import { useResource } from '../../hooks/use-resource';
import type { AdminUserListItem } from '../../services/api';
import { deleteUser, getUsers } from '../../services/api';
import { filterByText } from '../../utils/filter';
import { cityLabel } from '../../utils/labels';
import { DeleteButton } from '../delete-button';
import { Pagination } from '../pagination';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { UserEditModal } from '../user-edit-modal';

function userName(user: AdminUserListItem): string {
  return user.name ?? user.email;
}

export function UsuariosSection() {
  const { items, total, page, pageSize, loading, error, setPage, reload } =
    useResource<AdminUserListItem>(getUsers);
  const { user: currentUser } = useUser();
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUserListItem | null>(null);

  const visible = useMemo(
    () => filterByText(items, search, (user) => `${userName(user)} ${user.email} ${user.role}`),
    [items, search],
  );

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteUser(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  const isSelf = (user: AdminUserListItem) =>
    Boolean(user.isSelf) ||
    Boolean(currentUser?.primaryEmailAddress?.emailAddress &&
      user.email.toLowerCase() === currentUser.primaryEmailAddress.emailAddress.toLowerCase());

  return (
    <>
      {error && <p className="text-sm mb-4 text-danger">{error}</p>}
      {actionError && <p className="text-sm mb-4 text-danger">{actionError}</p>}

      <p className="text-xs mb-4 text-text-muted">
        Administradores podem editar perfil (nome, cidade e permissão), e
        excluir contas — a exclusão remove também os registros relacionados
        (LGPD). A própria conta não pode ter a permissão alterada nem ser
        excluída.
      </p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar usuário…" />
        {search && <span className="text-xs text-text-muted">A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        loading={loading}
        headers={['Nome', 'E-mail', 'Perfil', 'Cidade', 'Criado em', 'Ações']}
        rows={visible.map((user) => [
          userName(user),
          user.email,
          user.role === 'admin' ? 'Administrador' : 'Usuário',
          cityLabel(user.city),
          user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—',
          <span key={user._id} className="flex flex-1 gap-2 sm:inline-flex sm:flex-none">
            <button
              type="button"
              onClick={() => setEditing(user)}
              className="h-8 flex-1 rounded-(--radius-input) border border-primary/40 bg-surface-hover px-3 text-xs font-medium text-primary transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-[#111827] active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-8 sm:flex-none"
            >
              Editar
            </button>
            <DeleteButton
              label="Excluir"
              onConfirm={() => void handleDelete(user._id)}
            />
          </span>,
        ])}
        mobileRows={visible.map((user) => ({
          id: user._id,
          primary: userName(user),
          secondary: `${user.email} • ${user.role === 'admin' ? 'Administrador' : 'Usuário'} • ${cityLabel(user.city)}`,
          actions: (
            <span className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={() => setEditing(user)}
                className="h-8 flex-1 rounded-(--radius-input) border border-primary/40 bg-surface-hover px-3 text-xs font-medium text-primary transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-[#111827] active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Editar
              </button>
              <DeleteButton
                label="Excluir"
                onConfirm={() => void handleDelete(user._id)}
              />
            </span>
          ),
        }))}
        emptyMessage="Nenhum usuário encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />

      {editing && (
        <UserEditModal
          user={editing}
          isSelf={isSelf(editing)}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}
