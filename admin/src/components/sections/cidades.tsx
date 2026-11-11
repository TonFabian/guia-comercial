import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { createCity, deleteCity } from '../../services/api';
import type { CityInput } from '../../services/api';
import type { City } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input } from '../ui/input';
import { DeleteButton } from '../delete-button';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { DotsLoader } from '../ui/loading';

export interface CidadesSectionProps {
  cities: City[];
  citiesError: string | null;
  /** Recarrega o catálogo (a rota `/cities` não é paginada). */
  onReload: () => void;
}

interface CityForm {
  name: string;
  slug: string;
  state: string;
}

const EMPTY_FORM: CityForm = { name: '', slug: '', state: '' };

export function CidadesSection({ cities, citiesError, onReload }: CidadesSectionProps) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CityForm>(EMPTY_FORM);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');

  const visible = useMemo(
    () => filterByText(cities, search, (city) => `${city.name} ${city.slug} ${city.state}`),
    [cities, search],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    const payload: CityInput = { name: form.name, slug: form.slug, state: form.state };

    try {
      await createCity(payload);
      setForm(EMPTY_FORM);
      setView('list');
      onReload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteCity(id);
      onReload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between gap-3">
          <button type="button" onClick={() => setView('list')} className="text-sm text-text-muted hover:text-text">
            ← Cidades
          </button>
          <div className="flex gap-2">
                        <Button type="submit" form="cidade-form" disabled={saving}>
              {saving ? <DotsLoader size="sm" color="text-[#111827]" /> : 'Criar'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setView('list')} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>

        <h1 className="form-title text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Nova cidade
        </h1>

        {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <form id="cidade-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Dados da cidade
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Slug (kebab-case)">
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </Field>
              <Field label="Estado (UF)">
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
              </Field>
            </div>
          </Card>
        </form>

        <p className="text-xs text-text-muted">
          O backend expõe apenas criação e exclusão de cidades (não há rota de atualização), por isso esta seção não
          oferece edição.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cidade…" />
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Nova cidade
        </Button>
      </div>
      {search && <span className="text-xs text-text-muted">{visible.length} de {cities.length} cidades.</span>}

      <Table
        headers={['Nome', 'Slug', 'Estado', 'Ações']}
        rows={visible.map((city) => [
          city.name,
          city.slug,
          city.state,
          <DeleteButton key={city._id} onConfirm={() => void handleDelete(city._id)} />,
        ])}
        mobileRows={visible.map((city) => ({
          id: city._id,
          primary: city.name,
          secondary: `${city.slug} • ${city.state}`,
          actions: <DeleteButton key={city._id} onConfirm={() => void handleDelete(city._id)} />,
        }))}
        emptyMessage="Nenhuma cidade encontrada."
      />
    </div>
  );
}
