import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createBanner, deleteBanner, getBanners, updateBanner } from '../../services/api';
import type { BannerInput } from '../../services/api';
import type { Banner } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input, CheckboxField } from '../ui/input';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { Pagination } from '../pagination';

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
  const [view, setView] = useState<'list' | 'form'>('list');

  const visible = useMemo(
    () => filterByText(items, search, (banner) => `${banner.title} ${banner.subtitle ?? ''} ${banner.link ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('list');
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
    setView('form');
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

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between gap-3">
          <button type="button" onClick={resetForm} className="text-sm text-text-muted hover:text-text">
            ← Banners
          </button>
          <div className="flex gap-2">
                        <Button type="submit" form="banner-form" disabled={saving}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
            <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>

        <h1 className="form-title text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {editingId ? 'Editar banner' : 'Novo banner'}
        </h1>

        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <form id="banner-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Dados do banner
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
              <Field label="Subtítulo">
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </Field>
              <Field label="URL da imagem">
                <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
              </Field>
              <Field label="Link">
                <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              </Field>
              <Field label="Ordem">
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </Field>
              <div className="sm:col-span-2">
                <CheckboxField label="Ativo" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              </div>
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
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar banner…" />
        <Button
          onClick={() => {
            resetForm();
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Novo banner
        </Button>
      </div>
      {search && <span className="text-xs text-text-muted">{visible.length} de {items.length} banners.</span>}

      <Table
        loading={loading}
        headers={['Título', 'Subtítulo', 'Ordem', 'Ativo', 'Ações']}
        rows={visible.map((banner) => [
          banner.title,
          banner.subtitle ?? '—',
          banner.order ?? 0,
          banner.active ? 'Sim' : 'Não',
          <RowActions key={banner._id} onEdit={() => startEdit(banner)} onDelete={() => void handleDelete(banner._id)} />,
        ])}
        mobileRows={visible.map((banner) => ({
          id: banner._id,
          primary: banner.title,
          secondary: `${banner.subtitle ?? '—'} • ordem ${banner.order ?? 0} • ${banner.active ? 'Ativo' : 'Inativo'}`,
          actions: <RowActions key={banner._id} onEdit={() => startEdit(banner)} onDelete={() => void handleDelete(banner._id)} />,
        }))}
        emptyMessage="Nenhum banner encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
    </div>
  );
}
