import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createPublicUtility, deletePublicUtility, getPublicUtilities, updatePublicUtility } from '../../services/api';
import type { PublicUtilityInput } from '../../services/api';
import type { City, PublicUtility, PublicUtilityCategory } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { cityLabel, citySlug } from '../../utils/labels';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input, Select, Textarea, CheckboxField } from '../ui/input';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { DotsLoader } from '../ui/loading';
import { Pagination } from '../pagination';

export interface UtilidadePublicaSectionProps {
  cities: City[];
  citiesError: string | null;
}

interface PublicUtilityForm {
  name: string;
  description: string;
  category: PublicUtilityCategory;
  phone: string;
  details: string;
  icon: string;
  city: string;
  order: number;
  active: boolean;
}

const EMPTY_FORM: PublicUtilityForm = {
  name: '',
  description: '',
  category: 'emergency',
  phone: '',
  details: '',
  icon: '',
  city: '',
  order: 0,
  active: true,
};

const CATEGORY_LABELS: { value: PublicUtilityCategory; label: string }[] = [
  { value: 'emergency', label: 'Emergência' },
  { value: 'health', label: 'Saúde' },
  { value: 'civil', label: 'Defesa civil' },
  { value: 'sanitation', label: 'Saneamento' },
];

function categoryLabel(category: PublicUtilityCategory): string {
  return CATEGORY_LABELS.find((option) => option.value === category)?.label ?? category;
}

export function UtilidadePublicaSection({ cities, citiesError }: UtilidadePublicaSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<PublicUtility>(
    getPublicUtilities,
  );
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<PublicUtilityForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');

  const visible = useMemo(
    () => filterByText(items, search, (utility) => `${utility.name} ${utility.description} ${utility.phone ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('list');
  }

  function startEdit(utility: PublicUtility) {
    setEditingId(utility._id);
    setActionError(null);
    setForm({
      name: utility.name,
      description: utility.description ?? '',
      category: utility.category,
      phone: utility.phone ?? '',
      details: (utility.details ?? []).join('\n'),
      icon: utility.icon ?? '',
      city: citySlug(utility.city, cities),
      order: utility.order ?? 0,
      active: utility.active,
    });
    setView('form');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    const details = form.details
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const payload: PublicUtilityInput = {
      name: form.name,
      description: form.description,
      category: form.category,
      phone: form.phone.trim() || null,
      details,
      icon: form.icon.trim() || null,
      city: form.city || null,
      order: form.order,
      active: form.active,
    };

    try {
      if (editingId) {
        await updatePublicUtility(editingId, payload);
      } else {
        await createPublicUtility(payload);
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
      await deletePublicUtility(id);
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
            ← Utilidade Pública
          </button>
          <div className="flex gap-2">
                        <Button type="submit" form="utilidade-form" disabled={saving}>
              {saving ? <DotsLoader size="sm" /> : editingId ? 'Salvar' : 'Criar'}
            </Button>
            <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>

        <h1 className="form-title text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {editingId ? 'Editar utilidade pública' : 'Nova utilidade pública'}
        </h1>

        {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <form id="utilidade-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Dados da utilidade
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Categoria">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PublicUtilityCategory })}>
                  {CATEGORY_LABELS.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Telefone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Ícone">
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </Field>
              <Field label="Cidade">
                <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  <option value="">Cidade</option>
                  {cities.map((city) => (
                    <option key={city._id} value={city.slug}>
                      {city.name} — {city.state}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ordem">
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descrição">
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Detalhes (um por linha)">
                  <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
                </Field>
              </div>
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
      {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar utilidade…" />
        <Button
          onClick={() => {
            resetForm();
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Nova utilidade
        </Button>
      </div>
      {search && <span className="text-xs text-text-muted">{visible.length} de {items.length} utilidades.</span>}

      <Table
        loading={loading}
        headers={['Nome', 'Categoria', 'Telefone', 'Cidade', 'Ativo', 'Ações']}
        rows={visible.map((utility) => [
          utility.name,
          categoryLabel(utility.category),
          utility.phone ?? '—',
          cityLabel(utility.city),
          utility.active ? 'Sim' : 'Não',
          <RowActions key={utility._id} onEdit={() => startEdit(utility)} onDelete={() => void handleDelete(utility._id)} />,
        ])}
        mobileRows={visible.map((utility) => ({
          id: utility._id,
          primary: utility.name,
          secondary: `${categoryLabel(utility.category)} • ${utility.phone ?? '—'} • ${cityLabel(utility.city)}`,
          actions: <RowActions key={utility._id} onEdit={() => startEdit(utility)} onDelete={() => void handleDelete(utility._id)} />,
        }))}
        emptyMessage="Nenhuma utilidade encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
    </div>
  );
}
