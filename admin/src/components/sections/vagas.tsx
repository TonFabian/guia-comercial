import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createJob, deleteJob, getJobs, updateJob } from '../../services/api';
import type { JobInput } from '../../services/api';
import type { Company, Job } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { companyId, companyLabel } from '../../utils/labels';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input, Select, Textarea } from '../ui/input';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { Pagination } from '../pagination';

export interface VagasSectionProps {
  companies: Company[];
  /** Total de empresas no backend (a lista de opções é limitada a 100). */
  companiesTotal: number;
  companiesError: string | null;
}

interface JobForm {
  title: string;
  company: string;
  description: string;
  location: string;
  type: string;
}

const EMPTY_FORM: JobForm = {
  title: '',
  company: '',
  description: '',
  location: '',
  type: 'CLT',
};

const JOB_TYPES = [
  { value: 'CLT', label: 'CLT' },
  { value: 'Part-time', label: 'Meio período' },
  { value: 'PJ', label: 'PJ' },
];

export function VagasSection({ companies, companiesError }: VagasSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<Job>(getJobs);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<JobForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');

  const visible = useMemo(
    () => filterByText(items, search, (job) => `${job.title} ${job.location ?? ''} ${job.type ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('list');
  }

  function startEdit(job: Job) {
    setEditingId(job._id);
    setActionError(null);
    setForm({
      title: job.title,
      company: companyId(job.company),
      description: job.description ?? '',
      location: job.location ?? '',
      type: job.type ?? 'CLT',
    });
    setView('form');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    const payload: JobInput = {
      title: form.title,
      company: form.company,
      description: form.description || undefined,
      location: form.location || undefined,
      type: form.type || undefined,
    };

    try {
      if (editingId) {
        await updateJob(editingId, payload);
      } else {
        await createJob(payload);
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
      await deleteJob(id);
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
            ← Vagas
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="vaga-form" disabled={saving}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {editingId ? 'Editar vaga' : 'Nova vaga'}
        </h1>

        {companiesError && <p className="text-sm text-danger">Falha ao carregar empresas: {companiesError}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <form id="vaga-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Dados da vaga
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
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
              <Field label="Localização">
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
              <Field label="Tipo">
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {JOB_TYPES.map((jobType) => (
                    <option key={jobType.value} value={jobType.value}>
                      {jobType.label}
                    </option>
                  ))}
                </Select>
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
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar vaga…" />
        <Button
          onClick={() => {
            resetForm();
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Nova vaga
        </Button>
      </div>
      {search && <span className="text-xs text-text-muted">{visible.length} de {items.length} vagas.</span>}

      <Table
        loading={loading}
        headers={['Título', 'Empresa', 'Tipo', 'Localização', 'Ações']}
        rows={visible.map((job) => [
          job.title,
          companyLabel(job.company),
          job.type ?? '—',
          job.location ?? '—',
          <RowActions key={job._id} onEdit={() => startEdit(job)} onDelete={() => void handleDelete(job._id)} />,
        ])}
        mobileRows={visible.map((job) => ({
          id: job._id,
          primary: job.title,
          secondary: `${companyLabel(job.company)} • ${job.type ?? '—'} • ${job.location ?? '—'}`,
          actions: <RowActions key={job._id} onEdit={() => startEdit(job)} onDelete={() => void handleDelete(job._id)} />,
        }))}
        emptyMessage="Nenhuma vaga encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
    </div>
  );
}
