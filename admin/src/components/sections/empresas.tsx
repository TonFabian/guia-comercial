import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createCompany, deleteCompany, getCompanies, updateCompany } from '../../services/api';
import type { CompanyInput } from '../../services/api';
import type { Category, City, Company } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { categoryId, categoryLabel, cityLabel, citySlug } from '../../utils/labels';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { checkLabelStyle, errorStyle, formStyle, hintStyle, toolbarStyle } from '../styles';
import { Table } from '../table';

export interface EmpresasSectionProps {
  categories: Category[];
  categoriesError: string | null;
  cities: City[];
  citiesError: string | null;
}

interface CompanyForm {
  name: string;
  slug: string;
  description: string;
  category: string;
  city: string;
  phone: string;
  whatsapp: string;
  samePhone: boolean;
}

const EMPTY_FORM: CompanyForm = {
  name: '',
  slug: '',
  description: '',
  category: '',
  city: '',
  phone: '',
  whatsapp: '',
  samePhone: false,
};

export function EmpresasSection({ categories, categoriesError, cities, citiesError }: EmpresasSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<Company>(getCompanies);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => filterByText(items, search, (company) => `${company.name} ${company.slug} ${cityLabel(company.city)}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(company: Company) {
    setEditingId(company._id);
    setActionError(null);
    setForm({
      name: company.name,
      slug: company.slug,
      description: company.description ?? '',
      category: categoryId(company.category),
      city: citySlug(company.city, cities),
      phone: company.phone ?? '',
      whatsapp: company.whatsapp ?? '',
      samePhone: false,
    });
  }

  function handlePhoneChange(value: string) {
    setForm((previous) => ({
      ...previous,
      phone: value,
      whatsapp: previous.samePhone ? value : previous.whatsapp,
    }));
  }

  function handleSamePhoneChange(checked: boolean) {
    setForm((previous) => ({
      ...previous,
      samePhone: checked,
      whatsapp: checked ? previous.phone : previous.whatsapp,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    const payload: CompanyInput = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      category: form.category,
      city: form.city || undefined,
      phone: form.phone || undefined,
      whatsapp: form.whatsapp || undefined,
    };

    try {
      if (editingId) {
        await updateCompany(editingId, payload);
      } else {
        await createCompany(payload);
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
      await deleteCompany(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      {categoriesError && <p style={errorStyle}>Falha ao carregar categorias: {categoriesError}</p>}
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
          placeholder="Slug"
          value={form.slug}
          onChange={(event) => setForm({ ...form, slug: event.target.value })}
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
          onChange={(event) => setForm({ ...form, category: event.target.value })}
          required
        >
          <option value="">Categoria</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        <select value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })}>
          <option value="">Cidade</option>
          {cities.map((city) => (
            <option key={city._id} value={city.slug}>
              {city.name} — {city.state}
            </option>
          ))}
        </select>
        <input
          placeholder="Telefone (ligar)"
          value={form.phone}
          onChange={(event) => handlePhoneChange(event.target.value)}
        />
        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            checked={form.samePhone}
            onChange={(event) => handleSamePhoneChange(event.target.checked)}
          />
          Usar o mesmo número para WhatsApp
        </label>
        <input
          placeholder="WhatsApp"
          value={form.whatsapp}
          onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
          disabled={form.samePhone}
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

      <div style={toolbarStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar empresa…" />
        {search && <span style={hintStyle}>A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Nome', 'Categoria', 'Cidade', 'Telefone', 'Ações']}
        rows={visible.map((company) => [
          company.name,
          categoryLabel(company.category),
          cityLabel(company.city),
          company.phone ?? '—',
          <RowActions
            key={company._id}
            onEdit={() => startEdit(company)}
            onDelete={() => void handleDelete(company._id)}
          />,
        ])}
        emptyMessage="Nenhuma empresa encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p style={hintStyle}>Carregando…</p>}
    </>
  );
}
