import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import {
  createPublicUtility,
  deletePublicUtility,
  getPublicUtilities,
  updatePublicUtility,
} from '../../services/api';
import type { PublicUtilityInput } from '../../services/api';
import type { City, PublicUtility, PublicUtilityCategory } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { cityLabel, citySlug } from '../../utils/labels';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { checkLabelStyle, errorStyle, formStyle, hintStyle, toolbarStyle } from '../styles';
import { Table } from '../table';

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

  const visible = useMemo(
    () =>
      filterByText(
        items,
        search,
        (utility) => `${utility.name} ${utility.description} ${utility.phone ?? ''}`,
      ),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
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
      // `null` limpa o campo salvo; lista vazia limpa os detalhes.
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

  return (
    <>
      {citiesError && <p style={errorStyle}>Falha ao carregar cidades: {citiesError}</p>}
      {error && <p style={errorStyle}>{error}</p>}
      {actionError && <p style={errorStyle}>{actionError}</p>}

      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          placeholder="Nome"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <input
          placeholder="Descrição"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          required
        />
        <select
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value as PublicUtilityCategory })}
        >
          {CATEGORY_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Telefone"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <input
          placeholder="Ícone"
          value={form.icon}
          onChange={(event) => setForm({ ...form, icon: event.target.value })}
        />
        <select value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })}>
          <option value="">Cidade</option>
          {cities.map((city) => (
            <option key={city._id} value={city.slug}>
              {city.name} — {city.state}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Ordem"
          value={form.order}
          onChange={(event) => setForm({ ...form, order: Number(event.target.value) })}
        />
        <label style={checkLabelStyle}>
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

      <textarea
        placeholder="Detalhes (um por linha)"
        value={form.details}
        onChange={(event) => setForm({ ...form, details: event.target.value })}
        style={{ minWidth: 300, minHeight: 60, width: '100%', marginBottom: 12 }}
      />

      <div style={toolbarStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar serviço…" />
        {search && <span style={hintStyle}>A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Nome', 'Categoria', 'Telefone', 'Cidade', 'Ordem', 'Ativo', 'Ações']}
        rows={visible.map((utility) => [
          utility.name,
          categoryLabel(utility.category),
          utility.phone ?? '—',
          cityLabel(utility.city),
          utility.order ?? 0,
          utility.active ? 'Sim' : 'Não',
          <RowActions
            key={utility._id}
            onEdit={() => startEdit(utility)}
            onDelete={() => void handleDelete(utility._id)}
          />,
        ])}
        emptyMessage="Nenhum serviço de utilidade pública encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p style={hintStyle}>Carregando…</p>}
    </>
  );
}
