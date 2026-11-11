import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../../services/api';
import type { CategoryInput } from '../../services/api';
import type { Category } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input } from '../ui/input';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { Pagination } from '../pagination';

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
  const [view, setView] = useState<'list' | 'form'>('list');

  const visible = useMemo(
    () => filterByText(items, search, (category) => `${category.name} ${category.slug} ${category.icon ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('list');
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
    setView('form');
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

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between gap-3">
          <button type="button" onClick={resetForm} className="text-sm text-text-muted hover:text-text">
            ← Categorias
          </button>
          <div className="flex gap-2">
                        <Button type="submit" form="categoria-form" disabled={saving}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
            <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {editingId ? 'Editar categoria' : 'Nova categoria'}
        </h1>

        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <form id="categoria-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Dados da categoria
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Slug (kebab-case)">
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </Field>
              <Field label="Ícone">
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </Field>
              <Field label="Ordem">
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </Field>
            </div>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar categoria…" />
        <Button
          onClick={() => {
            resetForm();
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Nova categoria
        </Button>
      </div>
      {search && <span className="text-xs text-text-muted">{visible.length} de {items.length} categorias.</span>}

      <Table
        loading={loading}
        headers={['Nome', 'Slug', 'Ícone', 'Ordem', 'Ações']}
        rows={visible.map((category) => [
          category.name,
          category.slug,
          category.icon ?? '—',
          category.order ?? 0,
          <RowActions key={category._id} onEdit={() => startEdit(category)} onDelete={() => void handleDelete(category._id)} />,
        ])}
        mobileRows={visible.map((category) => ({
          id: category._id,
          primary: category.name,
          secondary: `${category.slug} • ícone ${category.icon ?? '—'} • ordem ${category.order ?? 0}`,
          actions: <RowActions key={category._id} onEdit={() => startEdit(category)} onDelete={() => void handleDelete(category._id)} />,
        }))}
        emptyMessage="Nenhuma categoria encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
    </div>
  );
}
