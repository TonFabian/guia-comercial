import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createNotice, deleteNotice, getNotices, updateNotice } from '../../services/api';
import type { NoticeInput, NoticeType } from '../../services/api';
import type { Notice } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { checkLabelStyle, errorStyle, formStyle, hintStyle, toolbarStyle } from '../styles';
import { Table } from '../table';

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

  const visible = useMemo(
    () => filterByText(items, search, (notice) => `${notice.title} ${notice.body}`),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
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

  return (
    <>
      {error && <p style={errorStyle}>{error}</p>}
      {actionError && <p style={errorStyle}>{actionError}</p>}

      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          placeholder="Título"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
        />
        <textarea
          placeholder="Texto do aviso"
          value={form.body}
          onChange={(event) => setForm({ ...form, body: event.target.value })}
          required
          style={{ minWidth: 300, minHeight: 60 }}
        />
        <select
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value as NoticeType })}
        >
          {NOTICE_TYPES.map((noticeType) => (
            <option key={noticeType.value} value={noticeType.value}>
              {noticeType.label}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          placeholder="Início (opcional)"
          value={form.startsAt}
          onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
        />
        <input
          type="datetime-local"
          placeholder="Expira em (opcional)"
          value={form.expiresAt}
          onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
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

      <div style={toolbarStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar aviso…" />
        {search && <span style={hintStyle}>A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Título', 'Tipo', 'Validade', 'Ativo', 'Ações']}
        rows={visible.map((notice) => [
          notice.title,
          noticeTypeLabel(notice.type),
          notice.expiresAt ? new Date(notice.expiresAt).toLocaleString() : '—',
          notice.active ? 'Sim' : 'Não',
          <RowActions
            key={notice._id}
            onEdit={() => startEdit(notice)}
            onDelete={() => void handleDelete(notice._id)}
          />,
        ])}
        emptyMessage="Nenhum aviso encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p style={hintStyle}>Carregando…</p>}
    </>
  );
}
