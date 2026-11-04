import { useMemo, useState } from 'react';

import { useResource } from '../../hooks/use-resource';
import { getUsers } from '../../services/api';
import type { AdminUserListItem } from '../../services/api';
import { filterByText } from '../../utils/filter';
import { cityLabel } from '../../utils/labels';
import { Pagination } from '../pagination';
import { SearchInput } from '../search-input';
import { errorStyle, hintStyle, toolbarStyle } from '../styles';
import { Table } from '../table';

function userName(user: AdminUserListItem): string {
  return user.name ?? user.email;
}

export function UsuariosSection() {
  const { items, total, page, pageSize, loading, error, setPage } = useResource<AdminUserListItem>(getUsers);
  const [search, setSearch] = useState('');

  const visible = useMemo(
    () => filterByText(items, search, (user) => `${userName(user)} ${user.email} ${user.role}`),
    [items, search],
  );

  return (
    <>
      {error && <p style={errorStyle}>{error}</p>}

      <p style={hintStyle}>
        Somente leitura: o backend não expõe endpoints de escrita de usuários (criação, edição ou
        exclusão). O perfil é mantido no Clerk e espelhado no banco pelo webhook.
      </p>

      <div style={toolbarStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar usuário…" />
        {search && <span style={hintStyle}>A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Nome', 'E-mail', 'Perfil', 'Cidade', 'Criado em']}
        rows={visible.map((user) => [
          userName(user),
          user.email,
          user.role === 'admin' ? 'Administrador' : 'Usuário',
          cityLabel(user.city),
          user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—',
        ])}
        emptyMessage="Nenhum usuário encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p style={hintStyle}>Carregando…</p>}
    </>
  );
}
