import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createCompany, deleteCompany, getCompanies, updateCompany, updateCompanyPlan } from '../../services/api';
import type { CompanyInput } from '../../services/api';
import type { Category, City, Company } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { categoryId, categoryLabel, cityLabel, citySlug } from '../../utils/labels';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input, Select, Textarea, CheckboxField } from '../ui/input';
import { PlanChip, planChipLabel } from '../ui/plan-chip';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
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

const DAYS = [0, 1, 2, 3, 4, 5, 6];

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
  const [view, setView] = useState<'list' | 'form'>('list');

  const visible = useMemo(
    () => filterByText(items, search, (company) => `${company.name} ${company.slug} ${cityLabel(company.city)}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('list');
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
    setView('form');
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

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={resetForm}
            className="text-sm text-text-muted hover:text-text"
          >
            ← Empresas
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="empresa-form" disabled={saving}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {editingId ? 'Editar empresa' : 'Nova empresa'}
        </h1>

        {(categoriesError || citiesError || actionError) && (
          <div className="space-y-1 text-sm text-danger">
            {categoriesError && <p>Falha ao carregar categorias: {categoriesError}</p>}
            {citiesError && <p>Falha ao carregar cidades: {citiesError}</p>}
            {actionError && <p>{actionError}</p>}
          </div>
        )}

        <form id="empresa-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Dados básicos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                />
              </Field>
              <Field label="Descrição">
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </Field>
              <Field label="Categoria">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                  <option value="">Categoria</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
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
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Contato
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefone (ligar)">
                <Input value={form.phone} onChange={(e) => handlePhoneChange(e.target.value)} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} disabled={form.samePhone} />
              </Field>
              <div className="sm:col-span-2">
                <CheckboxField
                  label="Usar o mesmo número para WhatsApp"
                  checked={form.samePhone}
                  onChange={(e) => handleSamePhoneChange(e.target.checked)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Assinatura
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <PlanChip plan={form.plan} />
              <Select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value as 'free' | 'basic' | 'premium' })}
                className="w-40"
              >
                <option value="free">Plano: Gratuito</option>
                <option value="basic">Plano: Básico</option>
                <option value="premium">Plano: Premium</option>
              </Select>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Horário de funcionamento
            </h2>
            <div className="space-y-2">
              {form.schedule.map((item, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[60px_1fr_1fr_auto] sm:items-center">
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
                    className="h-10 rounded-[--radius-input] border border-border bg-surface px-2 text-sm"
                  />
                  <input
                    type="time"
                    value={minutesToTime(item.opens)}
                    onChange={(e) => {
                      const next = [...form.schedule];
                      next[index] = { ...item, opens: timeToMinutes(e.target.value) };
                      setForm({ ...form, schedule: next });
                    }}
                    className="h-10 rounded-[--radius-input] border border-border bg-surface px-2 text-sm"
                  />
                  <input
                    type="time"
                    value={minutesToTime(item.closes)}
                    onChange={(e) => {
                      const next = [...form.schedule];
                      next[index] = { ...item, closes: timeToMinutes(e.target.value) };
                      setForm({ ...form, schedule: next });
                    }}
                    className="h-10 rounded-[--radius-input] border border-border bg-surface px-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, schedule: form.schedule.filter((_, i) => i !== index) })}
                    className="h-10 rounded-[--radius-input] border border-danger/30 bg-danger/10 px-2 text-xs text-danger"
                  >
                    Remover
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" type="button" onClick={() => setForm({ ...form, schedule: [...form.schedule, { day: 0, opens: 0, closes: 0 }] })}>
                  Adicionar dia
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setForm({ ...form, schedule: DAYS.map((day) => ({ day, opens: 480, closes: 1080 })) })}
                >
                  Preencher semana
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categoriesError && <p className="text-sm text-danger">Falha ao carregar categorias: {categoriesError}</p>}
      {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar empresa…" />
        <Button
          onClick={() => {
            resetForm();
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Nova empresa
        </Button>
      </div>
      {search && <p className="text-xs text-text-muted">A busca filtra os itens da página atual.</p>}

      <Table
        headers={['Nome', 'Categoria', 'Cidade', 'Telefone', 'Plano', 'Ações']}
        rows={visible.map((company) => [
          company.name,
          categoryLabel(company.category),
          cityLabel(company.city),
          company.phone ?? '—',
          <PlanChip key={company._id} plan={company.plan ?? 'free'} />,
          <RowActions
            key={`a-${company._id}`}
            onEdit={() => startEdit(company)}
            onDelete={() => void handleDelete(company._id)}
          />,
        ])}
        mobileRows={visible.map((company) => ({
          id: company._id,
          primary: company.name,
          secondary: `${categoryLabel(company.category)} • ${cityLabel(company.city)} • ${planChipLabel(company.plan ?? 'free')}`,
          actions: (
            <RowActions
              onEdit={() => startEdit(company)}
              onDelete={() => void handleDelete(company._id)}
            />
          ),
        }))}
        emptyMessage="Nenhuma empresa encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p className="text-sm text-text-muted">Carregando…</p>}
    </div>
  );
}

