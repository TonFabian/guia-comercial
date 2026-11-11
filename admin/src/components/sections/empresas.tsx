import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createCompany, deleteCompany, getCompanies, updateCompany, updateCompanyPlan } from '../../services/api';
import type { CompanyInput } from '../../services/api';
import type { Category, City, Company } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { categoryId, categoryLabel, cityLabel, citySlug, planLabel } from '../../utils/labels';
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

interface CompanyScheduleItemForm {
  day: number;
  opens: number;
  closes: number;
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
  schedule: CompanyScheduleItemForm[];
  plan: 'free' | 'basic' | 'premium';
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
  schedule: [],
  plan: 'free',
};


function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, mm] = t.split(':');
  return Number(h) * 60 + Number(mm);
}

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
      schedule: company.schedule ?? [],
      plan: company.plan ?? 'free',
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
      plan: form.plan,
      schedule: form.schedule,
    };

    try {
      if (editingId) {
        // `plan` NÃO vai no PUT de dados: updateCompany descarta o campo e a
        // rota dedicada altera o plano logo após (somente admin).
        await updateCompany(editingId, payload);
        try {
          await updateCompanyPlan(editingId, form.plan);
        } catch (err) {
          setActionError(
            `Dados salvos, mas o plano não pôde ser alterado: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } else {
        const created = await createCompany(payload);
        if (created?._id && form.plan !== 'free') {
          try {
            await updateCompanyPlan(created._id, form.plan);
          } catch (err) {
            setActionError(
              `Empresa criada, mas o plano não pôde ser definido: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
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
        <select
          value={form.plan}
          onChange={(event) => setForm({ ...form, plan: event.target.value as 'free' | 'basic' | 'premium' })}
        >
          <option value="free">Plano: Gratuito</option>
          <option value="basic">Plano: Básico</option>
          <option value="premium">Plano: Premium</option>
        </select>
        <fieldset>
          <legend>Horário de funcionamento</legend>
          {form.schedule.map((item, index) => (
            <div key={index}>
              <input
                type="number"
                min={0}
                max={6}
                value={item.day}
                onChange={(e) => {
                  const next = [...form.schedule];
                  next[index] = { ...item, day: Number(e.target.value) };
                  setForm({ ...form, schedule: next });
                }}
              />
              <input
                type="time"
                value={minutesToTime(item.opens)}
                onChange={(e) => {
                  const next = [...form.schedule];
                  next[index] = { ...item, opens: timeToMinutes(e.target.value) };
                  setForm({ ...form, schedule: next });
                }}
              />
              <input
                type="time"
                value={minutesToTime(item.closes)}
                onChange={(e) => {
                  const next = [...form.schedule];
                  next[index] = { ...item, closes: timeToMinutes(e.target.value) };
                  setForm({ ...form, schedule: next });
                }}
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, schedule: form.schedule.filter((_, i) => i !== index) })}
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm({ ...form, schedule: [...form.schedule, { day: 0, opens: 0, closes: 0 }] })}
          >
            Adicionar dia
          </button>
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: 480, closes: 1080 })),
              })
            }
          >
            Preencher semana
          </button>
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: 480, closes: 1080 })),
              })
            }
          >
            Preencher semana
          </button>
        </fieldset>
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
        headers={['Nome', 'Categoria', 'Cidade', 'Telefone', 'Plano', 'Ações']}
        rows={visible.map((company) => [
          company.name,
          categoryLabel(company.category),
          cityLabel(company.city),
          company.phone ?? '—',
          planLabel(company.plan),
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
