import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createBanner, deleteBanner, getBanners, updateBanner } from '../../services/api';
import type { BannerInput } from '../../services/api';
import type { Banner } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';

interface BannerForm {
  title: string;
  subtitle: string;
  image: string;
  link: string;
  order: number;
  active: boolean;
}

const EMPTY_FORM: BannerForm = {
  title: '',
  subtitle: '',
  image: '',
  link: '',
  order: 0,
  active: true,
};

export function BannersSection() {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<Banner>(getBanners);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => filterByText(items, search, (banner) => `${banner.title} ${banner.subtitle ?? ''} ${banner.link ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(banner: Banner) {
    setEditingId(banner._id);
    setActionError(null);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      image: banner.image ?? '',
      link: banner.link ?? '',
      order: banner.order ?? 0,
      active: banner.active ?? true,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    const payload: BannerInput = {
      title: form.title,
      subtitle: form.subtitle || undefined,
      image: form.image || undefined,
      link: form.link || undefined,
      order: form.order,
      active: form.active,
    };

    try {
      if (editingId) {
        await updateBanner(editingId, payload);
      } else {
        await createBanner(payload);
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
      await deleteBanner(id);
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
          placeholder="Título"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
        />
        <input
          placeholder="Subtítulo"
          value={form.subtitle}
          onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
        />
        <input
          placeholder="URL da imagem"
          value={form.image}
          onChange={(event) => setForm({ ...form, image: event.target.value })}
        />
        <input
          placeholder="Link"
          value={form.link}
          onChange={(event) => setForm({ ...form, link: event.target.value })}
        />
        <input
          type="number"
          placeholder="Ordem"
          value={form.order}
          onChange={(event) => setForm({ ...form, order: Number(event.target.value) })}
        />
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
          />
          Ativo
        </label>
        <button type="submit" disabled={saving}>
          {editingId ? 'Salvar' : 'Criar'}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm}>
            Cancelar
          </button>
        )}
      </form>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar banner…" />
        {search && <span className="text-xs text-text-muted">A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Título', 'Subtítulo', 'Link', 'Ordem', 'Ativo', 'Ações']}
        rows={visible.map((banner) => [
          banner.title,
          banner.subtitle ?? '—',
          banner.link ?? '—',
          banner.order ?? 0,
          banner.active ? 'Sim' : 'Não',
          <RowActions
            key={banner._id}
            onEdit={() => startEdit(banner)}
            onDelete={() => void handleDelete(banner._id)}
          />,
        ])}
        emptyMessage="Nenhum banner encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p className="text-xs text-text-muted">Carregando…</p>}
    </>
  );
}
