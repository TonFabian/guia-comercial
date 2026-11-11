import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../../services/api';
import type { CategoryInput } from '../../services/api';
import type { Category } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';

interface CategoryForm {
  name: string;
  slug: string;
  icon: string;
  order: number;
}

const EMPTY_FORM: CategoryForm = { name: '', slug: '', icon: '', order: 0 };

export function CategoriasSection() {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<Category>(getCategories);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => filterByText(items, search, (category) => `${category.name} ${category.slug} ${category.icon ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(category: Category) {
    setEditingId(category._id);
    setActionError(null);
    setForm({
      name: category.name,
      slug: category.slug,
      icon: category.icon ?? '',
      order: category.order ?? 0,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    const payload: CategoryInput = {
      name: form.name,
      slug: form.slug,
      icon: form.icon || undefined,
      order: form.order,
    };

    try {
      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }
      resetForm();
      setPage(1);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteCategory(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <form onSubmit={handleSubmit} className="mb-4 grid gap-3 rounded-[--radius-card] border border-border bg-surface p-4 shadow-[--shadow-card] sm:grid-cols-2">
        <input
          placeholder="Nome"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <input
          placeholder="Slug (kebab-case)"
          value={form.slug}
          onChange={(event) => setForm({ ...form, slug: event.target.value })}
          required
        />
        <input
          placeholder="Ícone"
          value={form.icon}
          onChange={(event) => setForm({ ...form, icon: event.target.value })}
        />
        <input
          type="number"
          placeholder="Ordem"
          value={form.order}
          onChange={(event) => setForm({ ...form, order: Number(event.target.value) })}
        />
        <button type="submit" disabled={saving}>
          {editingId ? 'Salvar' : 'Criar'}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm}>
            Cancelar
          </button>
        )}
      </form>
      <p className="text-xs text-text-muted">O slug deve estar em kebab-case (ex.: restaurantes).</p>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar categoria…" />
        {search && <span className="text-xs text-text-muted">A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Nome', 'Slug', 'Ícone', 'Ordem', 'Ações']}
        rows={visible.map((category) => [
          category.name,
          category.slug,
          category.icon ?? '—',
          category.order ?? 0,
          <RowActions
            key={category._id}
            onEdit={() => startEdit(category)}
            onDelete={() => void handleDelete(category._id)}
          />,
        ])}
        emptyMessage="Nenhuma categoria encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p className="text-xs text-text-muted">Carregando…</p>}
    </>
  );
}
