import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from '../../services/api';
import type { CouponInput } from '../../services/api';
import type { Company, Coupon } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { companyId, companyLabel } from '../../utils/labels';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input, Select, Textarea } from '../ui/input';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { Pagination } from '../pagination';

export interface CuponsSectionProps {
  companies: Company[];
  /** Total de empresas no backend (a lista de opções é limitada a 100). */
  companiesTotal: number;
  companiesError: string | null;
}

interface CouponForm {
  title: string;
  code: string;
  discount: string;
  description: string;
  company: string;
  expiresAt: string;
}

const EMPTY_FORM: CouponForm = {
  title: '',
  code: '',
  discount: '',
  description: '',
  company: '',
  expiresAt: '',
};

export function CuponsSection({ companies, companiesError }: CuponsSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<Coupon>(getCoupons);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');

  const visible = useMemo(
    () => filterByText(items, search, (coupon) => `${coupon.title} ${coupon.code ?? ''} ${coupon.discount ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('list');
  }

  function startEdit(coupon: Coupon) {
    setEditingId(coupon._id);
    setActionError(null);
    setForm({
      title: coupon.title,
      code: coupon.code ?? '',
      discount: coupon.discount ?? '',
      description: coupon.description ?? '',
      company: companyId(coupon.company),
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    });
    setView('form');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    const payload: CouponInput = {
      title: form.title,
      code: form.code,
      company: form.company,
      discount: form.discount || undefined,
      description: form.description || undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    };

    try {
      if (editingId) {
        await updateCoupon(editingId, payload);
      } else {
        await createCoupon(payload);
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
      await deleteCoupon(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={resetForm} className="text-sm text-text-muted hover:text-text">
            ← Cupons
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="cupom-form" disabled={saving}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {editingId ? 'Editar cupom' : 'Novo cupom'}
        </h1>

        {companiesError && <p className="text-sm text-danger">Falha ao carregar empresas: {companiesError}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <form id="cupom-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Dados do cupom
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
              <Field label="Código">
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </Field>
              <Field label="Desconto">
                <Input value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </Field>
              <Field label="Empresa">
                <Select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required>
                  <option value="">Empresa</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Expira em">
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descrição">
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
              </div>
            </div>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {companiesError && <p className="text-sm text-danger">Falha ao carregar empresas: {companiesError}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cupom…" />
        <Button
          onClick={() => {
            resetForm();
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Novo cupom
        </Button>
      </div>
      {search && <span className="text-xs text-text-muted">{visible.length} de {items.length} cupons.</span>}

      <Table
        headers={['Título', 'Código', 'Desconto', 'Empresa', 'Expira', 'Ações']}
        rows={visible.map((coupon) => [
          coupon.title,
          coupon.code ?? '—',
          coupon.discount ?? '—',
          companyLabel(coupon.company),
          coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : '—',
          <RowActions key={coupon._id} onEdit={() => startEdit(coupon)} onDelete={() => void handleDelete(coupon._id)} />,
        ])}
        mobileRows={visible.map((coupon) => ({
          id: coupon._id,
          primary: coupon.title,
          secondary: `${coupon.code ?? '—'} • ${coupon.discount ?? '—'} • ${companyLabel(coupon.company)}`,
          actions: <RowActions key={coupon._id} onEdit={() => startEdit(coupon)} onDelete={() => void handleDelete(coupon._id)} />,
        }))}
        emptyMessage="Nenhum cupom encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p className="text-sm text-text-muted">Carregando…</p>}
    </div>
  );
}
