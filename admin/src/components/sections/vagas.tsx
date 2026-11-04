import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createJob, deleteJob, getJobs, updateJob } from '../../services/api';
import type { JobInput } from '../../services/api';
import type { Company, Job } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { companyId, companyLabel } from '../../utils/labels';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { errorStyle, formStyle, hintStyle, toolbarStyle } from '../styles';
import { Table } from '../table';

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

export function VagasSection({ companies, companiesTotal, companiesError }: VagasSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<Job>(getJobs);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<JobForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => filterByText(items, search, (job) => `${job.title} ${job.location ?? ''} ${job.type ?? ''}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
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

  return (
    <>
      {companiesError && <p style={errorStyle}>Falha ao carregar empresas: {companiesError}</p>}
      {error && <p style={errorStyle}>{error}</p>}
      {actionError && <p style={errorStyle}>{actionError}</p>}

      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          placeholder="Título"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
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
          placeholder="Localização"
          value={form.location}
          onChange={(event) => setForm({ ...form, location: event.target.value })}
        />
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          {JOB_TYPES.map((jobType) => (
            <option key={jobType.value} value={jobType.value}>
              {jobType.label}
            </option>
          ))}
        </select>
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
        <p style={hintStyle}>
          Exibindo {companies.length} de {companiesTotal} empresas — consulte a seção Empresas para o
          restante.
        </p>
      )}

      <div style={toolbarStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar vaga…" />
        {search && <span style={hintStyle}>A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Título', 'Empresa', 'Localização', 'Tipo', 'Ações']}
        rows={visible.map((job) => [
          job.title,
          companyLabel(job.company),
          job.location ?? '—',
          job.type ?? '—',
          <RowActions
            key={job._id}
            onEdit={() => startEdit(job)}
            onDelete={() => void handleDelete(job._id)}
          />,
        ])}
        emptyMessage="Nenhuma vaga encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p style={hintStyle}>Carregando…</p>}
    </>
  );
}
