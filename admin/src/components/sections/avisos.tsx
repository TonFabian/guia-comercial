import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createNotice, deleteNotice, getNotices, updateNotice } from '../../services/api';
import type { NoticeInput, NoticeType } from '../../services/api';
import type { Notice } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input, Select, Textarea, CheckboxField } from '../ui/input';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { DotsLoader } from '../ui/loading';
import { Pagination } from '../pagination';

interface NoticeForm {
  title: string;
  body: string;
  type: NoticeType;
  startsAt: string;
  expiresAt: string;
  active: boolean;
}

const EMPTY_FORM: NoticeForm = {
  title: '',
  body: '',
  type: 'general',
  startsAt: '',
  expiresAt: '',
  active: true,
};

const NOTICE_TYPES: { value: NoticeType; label: string }[] = [
  { value: 'general', label: 'Geral' },
  { value: 'alert', label: 'Alerta' },
  { value: 'health', label: 'Saúde' },
];

function noticeTypeLabel(type: NoticeType): string {
  return NOTICE_TYPES.find((option) => option.value === type)?.label ?? type;
}

export function AvisosSection() {
  const { items, total, page, pageSize, loading, error, setPage, reload } = useResource<Notice>(getNotices);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<NoticeForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');

  const visible = useMemo(
    () => filterByText(items, search, (notice) => `${notice.title} ${notice.body}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('list');
  }

  function startEdit(notice: Notice) {
    setEditingId(notice._id);
    setActionError(null);
    setForm({
      title: notice.title,
      body: notice.body,
      type: notice.type ?? 'general',
      startsAt: notice.startsAt ? notice.startsAt.slice(0, 16) : '',
      expiresAt: notice.expiresAt ? notice.expiresAt.slice(0, 16) : '',
      active: notice.active,
    });
    setView('form');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    const payload: NoticeInput = {
      title: form.title,
      body: form.body,
      type: form.type,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      active: form.active,
    };

    try {
      if (editingId) {
        await updateNotice(editingId, payload);
      } else {
        await createNotice(payload);
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
      await deleteNotice(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between gap-3">
          <button type="button" onClick={resetForm} className="text-sm text-text-muted hover:text-text">
            ← Avisos
          </button>
          <div className="flex gap-2">
                        <Button type="submit" form="aviso-form" disabled={saving}>
              {saving ? <DotsLoader size="sm" /> : editingId ? 'Salvar' : 'Criar'}
            </Button>
            <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>

        <h1 className="form-title text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {editingId ? 'Editar aviso' : 'Novo aviso'}
        </h1>

        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <form id="aviso-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Conteúdo
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
              <Field label="Tipo">
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NoticeType })}>
                  {NOTICE_TYPES.map((noticeType) => (
                    <option key={noticeType.value} value={noticeType.value}>
                      {noticeType.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Texto do aviso">
                  <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Validade
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Início (opcional)">
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </Field>
              <Field label="Expira em (opcional)">
                <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <CheckboxField label="Ativo" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              </div>
            </div>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar aviso…" />
        <Button
          onClick={() => {
            resetForm();
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Novo aviso
        </Button>
      </div>
      {search && <span className="text-xs text-text-muted">A busca filtra os itens da página atual.</span>}

      <Table
        loading={loading}
        headers={['Título', 'Tipo', 'Validade', 'Ativo', 'Ações']}
        rows={visible.map((notice) => [
          notice.title,
          noticeTypeLabel(notice.type),
          notice.expiresAt ? new Date(notice.expiresAt).toLocaleString() : '—',
          notice.active ? 'Sim' : 'Não',
          <RowActions key={notice._id} onEdit={() => startEdit(notice)} onDelete={() => void handleDelete(notice._id)} />,
        ])}
        mobileRows={visible.map((notice) => ({
          id: notice._id,
          primary: notice.title,
          secondary: `${noticeTypeLabel(notice.type)} • ${notice.active ? 'Ativo' : 'Inativo'} • ${notice.expiresAt ? new Date(notice.expiresAt).toLocaleString() : 'sem expiração'}`,
          actions: <RowActions key={notice._id} onEdit={() => startEdit(notice)} onDelete={() => void handleDelete(notice._id)} />,
        }))}
        emptyMessage="Nenhum aviso encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
    </div>
  );
}
