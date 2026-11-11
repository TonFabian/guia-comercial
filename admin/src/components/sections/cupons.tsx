import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from '../../services/api';
import type { CouponInput } from '../../services/api';
import type { Company, Coupon } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { companyId, companyLabel } from '../../utils/labels';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';

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

export function CuponsSection({ companies, companiesTotal, companiesError }: CuponsSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<Coupon>(getCoupons);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => filterByText(items, search, (coupon) => `${coupon.title} ${coupon.code ?? ''} ${coupon.discount ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
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

  return (
    <>
      {companiesError && <p className="text-sm text-danger">Falha ao carregar empresas: {companiesError}</p>}
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
          placeholder="Código"
          value={form.code}
          onChange={(event) => setForm({ ...form, code: event.target.value })}
          required
        />
        <input
          placeholder="Desconto"
          value={form.discount}
          onChange={(event) => setForm({ ...form, discount: event.target.value })}
        />
        <select
          value={form.company}
          onChange={(event) => setForm({ ...form, company: event.target.value })}
          required
        >
          <option value="">Empresa</option>
          {companies.map((company) => (
            <option key={company._id} value={company._id}>
              {company.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Descrição"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <input
          type="date"
          placeholder="Validade (opcional)"
          value={form.expiresAt}
          onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
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
      {companiesTotal > companies.length && (
        <p className="text-xs text-text-muted">
          Exibindo {companies.length} de {companiesTotal} empresas — consulte a seção Empresas para o
          restante.
        </p>
      )}

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cupom…" />
        {search && <span className="text-xs text-text-muted">A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Título', 'Código', 'Desconto', 'Empresa', 'Validade', 'Ações']}
        rows={visible.map((coupon) => [
          coupon.title,
          coupon.code ?? '—',
          coupon.discount ? `${coupon.discount}%` : '—',
          companyLabel(coupon.company),
          coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : '—',
          <RowActions
            key={coupon._id}
            onEdit={() => startEdit(coupon)}
            onDelete={() => void handleDelete(coupon._id)}
          />,
        ])}
        emptyMessage="Nenhum cupom encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p className="text-xs text-text-muted">Carregando…</p>}
    </>
  );
}
