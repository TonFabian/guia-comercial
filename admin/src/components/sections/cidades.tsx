import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { createCity, deleteCity } from '../../services/api';
import type { CityInput } from '../../services/api';
import type { City } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { DeleteButton } from '../delete-button';
import { SearchInput } from '../search-input';
import { Table } from '../table';

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

  return (
    <>
      {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
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
          placeholder="Estado (UF)"
          value={form.state}
          onChange={(event) => setForm({ ...form, state: event.target.value })}
          required
        />
        <button type="submit" disabled={saving}>
          Criar
        </button>
      </form>
      <p className="text-xs text-text-muted">
        O backend expõe apenas criação e exclusão de cidades (não há rota de atualização), por isso esta
        seção não oferece edição.
      </p>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cidade…" />
        {search && <span className="text-xs text-text-muted">{visible.length} de {cities.length} cidades.</span>}
      </div>

      <Table
        headers={['Nome', 'Slug', 'Estado', 'Ações']}
        rows={visible.map((city) => [
          city.name,
          city.slug,
          city.state,
          <DeleteButton key={city._id} onConfirm={() => void handleDelete(city._id)} />,
        ])}
        emptyMessage="Nenhuma cidade encontrada."
      />
    </>
  );
}
