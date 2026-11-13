import { useMemo, useState, useEffect } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { toast } from 'sonner';
import {
  cancelPushCampaign,
  createPushCampaign,
  deletePushCampaign,
  getPushCampaign,
  getPushCampaigns,
  getUsers,
  getCompanies,
  getCities,
  sendPushCampaignNow,
} from '../../services/api';
import type { CreatePushCampaignInput } from '../../services/api';
import type { AdminUserListItem } from '../../services/api';
import type {
  City,
  Company,
  PushCampaign,
  PushCampaignSegment,
  PushCampaignSummary,
} from '../../types/domain';
import { DEEP_LINK_ROTAS } from '../../utils/deep-link';
export { DEEP_LINK_ROTAS } from '../../utils/deep-link';
import { filterByText } from '../../utils/filter';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input, Select, Textarea } from '../ui/input';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { DotsLoader } from '../ui/loading';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Pagination } from '../pagination';

interface CampaignForm {
  title: string;
  body: string;
  imageUrl: string;
  deepLinkMode: string;
  deepLinkSegment: string;
  segmentKind: PushCampaignSegment['kind'];
  userIds: string[];
  cityId: string;
  plan: 'basic' | 'premium';
  companyId: string;
  scheduledFor: string;
}

const EMPTY_FORM: CampaignForm = {
  title: '',
  body: '',
  imageUrl: '',
  deepLinkMode: 'none',
  deepLinkSegment: '',
  segmentKind: 'broadcast',
  userIds: [],
  cityId: '',
  plan: 'basic',
  companyId: '',
  scheduledFor: '',
};

const SEGMENT_OPTIONS: { value: PushCampaignSegment['kind']; label: string }[] = [
  { value: 'broadcast', label: 'Todos (broadcast)' },
  { value: 'user', label: 'Um usuário' },
  { value: 'users', label: 'Lista de usuários' },
  { value: 'city', label: 'Cidade' },
  { value: 'plan', label: 'Plano' },
  { value: 'favorites', label: 'Favoritos de empresa' },
];

const STATUS_LABELS: Record<PushCampaignSummary['status'], string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  sent: 'Enviada',
  failed: 'Falhou',
};

function statusChip(status: PushCampaignSummary['status']) {
  const colors: Record<PushCampaignSummary['status'], string> = {
    draft: 'bg-surface-hover text-text-muted',
    scheduled: 'bg-blue-500/15 text-blue-400',
    sending: 'bg-yellow-500/15 text-yellow-400',
    sent: 'bg-green-500/15 text-green-400',
    failed: 'bg-red-500/15 text-red-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function buildDeepLink(form: CampaignForm): string | undefined {
  if (form.deepLinkMode === 'none') return undefined;
  const rota = DEEP_LINK_ROTAS.find((r) => r.prefixo === form.deepLinkMode);
  if (!rota) return undefined;
  if (rota.exato) return rota.prefixo;
  const seg = form.deepLinkSegment.trim();
  return seg ? `${rota.prefixo}${seg}` : undefined;
}

function buildSegment(form: CampaignForm): PushCampaignSegment {
  const segment: PushCampaignSegment = { kind: form.segmentKind };
  if (form.segmentKind === 'user' || form.segmentKind === 'users') {
    segment.userIds = form.userIds;
  } else if (form.segmentKind === 'city') {
    segment.cityId = form.cityId;
  } else if (form.segmentKind === 'plan') {
    segment.plan = form.plan;
  } else if (form.segmentKind === 'favorites') {
    segment.companyId = form.companyId;
  }
  return segment;
}

export function NotificacoesSection() {
  const { items, total, page, pageSize, loading, error, setPage, reload } =
    useResource<PushCampaignSummary>(getPushCampaigns);

  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);

  const [active, setActive] = useState<PushCampaignSummary | PushCampaign | null>(null);
  const [detail, setDetail] = useState<PushCampaign | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Segment-dependent data.
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState('');

  const visible = useMemo(
    () => filterByText(items, search, (c) => `${c.title} ${c.body} ${c.status}`),
    [items, search],
  );

  // Fetch users when form segment needs them.
  useEffect(() => {
    if (view !== 'form') return;
    if (form.segmentKind !== 'user' && form.segmentKind !== 'users') return;
    let cancelled = false;
    setUsersLoading(true);
    getUsers(1, 50, userSearch)
      .then((res) => {
        if (!cancelled) setUsers(res.items);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, form.segmentKind, userSearch]);

  // Fetch cities when needed.
  useEffect(() => {
    if (view !== 'form') return;
    if (form.segmentKind !== 'city') return;
    if (cities.length > 0) return;
    let cancelled = false;
    getCities()
      .then((res) => {
        if (!cancelled) setCities(res);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [view, form.segmentKind, cities.length]);

  // Fetch companies when needed (favorites).
  useEffect(() => {
    if (view !== 'form') return;
    if (form.segmentKind !== 'favorites') return;
    if (companies.length > 0) return;
    let cancelled = false;
    getCompanies(1, 100)
      .then((res) => {
        if (!cancelled) setCompanies(res.items);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [view, form.segmentKind, companies.length]);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, companySearch]);

  function clearSegmentData() {
    setUsers([]);
    setCities([]);
    setCompanies([]);
    setUserSearch('');
    setCompanySearch('');
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setActionError(null);
    clearSegmentData();
    setView('list');
  }

  function openForm() {
    setForm(EMPTY_FORM);
    setActionError(null);
    clearSegmentData();
    setView('form');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    if (form.scheduledFor) {
      const iso = new Date(`${form.scheduledFor}:00-03:00`).toISOString();
      if (Number.isNaN(new Date(iso).getTime()) || new Date(iso).getTime() < Date.now()) {
        setActionError('Agendamento deve ser uma data futura.');
        setSaving(false);
        return;
      }
    }

    const payload: CreatePushCampaignInput = {
      title: form.title,
      body: form.body,
      imageUrl: form.imageUrl.trim() || undefined,
      deepLink: buildDeepLink(form),
      segment: buildSegment(form),
      scheduledFor: form.scheduledFor
        ? new Date(`${form.scheduledFor}:00-03:00`).toISOString()
        : undefined,
    };

    try {
      await createPushCampaign(payload);
      resetForm();
      setPage(1);
      toast.success('Campanha criada.');
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(campaign: PushCampaignSummary) {
    setActive(campaign);
    setView('detail');
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await getPushCampaign(campaign._id);
      setDetail(d);
      setActive(d);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      setView('list');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSendNow() {
    if (!active) return;
    setSaving(true);
    setActionError(null);
    try {
      const updated = await sendPushCampaignNow(active._id);
      setActive(updated);
      setDetail(updated);
      toast.success('Campanha enviada.');
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!active) return;
    setSaving(true);
    setActionError(null);
    try {
      const updated = await cancelPushCampaign(active._id);
      setActive(updated);
      setDetail(updated);
      toast.success('Campanha cancelada.');
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setActionError(null);
    try {
      await deletePushCampaign(id);
      toast.success('Excluída com sucesso.');
      if (active?._id === id) {
        setActive(null);
        setDetail(null);
        setView('list');
      }
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendNowId(id: string) {
    setSaving(true);
    setActionError(null);
    try {
      await sendPushCampaignNow(id);
      toast.success('Campanha enviada.');
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelId(id: string) {
    setSaving(true);
    setActionError(null);
    try {
      await cancelPushCampaign(id);
      toast.success('Campanha cancelada.');
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function toggleUser(id: string) {
    setForm((prev) => {
      const exists = prev.userIds.includes(id);
      let next = exists ? prev.userIds.filter((u) => u !== id) : [...prev.userIds, id];
      if (prev.segmentKind === 'user') {
        next = exists ? [] : [id];
      }
      return { ...prev, userIds: next };
    });
  }

  // ---------------------------------------------------------------- list
  if (view === 'list') {
    return (
      <div className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar campanha…" />
          <Button onClick={openForm}>
            + Nova campanha
          </Button>
        </div>

        <Table
          loading={loading}
          headers={['Título', 'Status', 'Enviados/Alvo', 'Criada em', 'Ações']}
          rows={visible.map((campaign) => [
            campaign.title,
            statusChip(campaign.status),
            `${campaign.stats.sent}/${campaign.stats.targeted}`,
            campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '—',
            <span key={campaign._id} className="flex flex-1 gap-2 sm:inline-flex sm:flex-none">
              <button
                type="button"
                onClick={() => void openDetail(campaign)}
                className="h-8 flex-1 rounded-(--radius-input) border border-primary/40 bg-surface-hover px-3 text-xs font-medium text-primary sm:flex-none"
              >
                Ver
              </button>
              {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSendNowId(campaign._id)}
                  className="h-8 flex-1 rounded-(--radius-input) border border-primary/40 bg-surface-hover px-3 text-xs font-medium text-primary sm:flex-none disabled:opacity-50"
                >
                  Enviar agora
                </button>
              )}
              {campaign.status === 'scheduled' && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleCancelId(campaign._id)}
                  className="h-8 flex-1 rounded-(--radius-input) border border-border bg-surface-hover px-3 text-xs font-medium text-text sm:flex-none disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
              {(campaign.status === 'draft' || campaign.status === 'failed') && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setPendingDeleteId(campaign._id)}
                  className="h-8 flex-1 rounded-(--radius-input) border border-danger/40 bg-surface-hover px-3 text-xs font-medium text-danger sm:flex-none disabled:opacity-50"
                >
                  Excluir
                </button>
              )}
            </span>,
          ])}
          mobileRows={visible.map((campaign) => ({
            id: campaign._id,
            primary: campaign.title,
            secondary: `${STATUS_LABELS[campaign.status]} • ${campaign.stats.sent}/${campaign.stats.targeted} enviados • ${campaign.createdByClerkId}`,
            actions: (
              <span className="flex flex-1 gap-2">
                <button
                  type="button"
                  onClick={() => void openDetail(campaign)}
                  className="h-8 flex-1 rounded-(--radius-input) border border-primary/40 bg-surface-hover px-3 text-xs font-medium text-primary"
                >
                  Ver
                </button>
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSendNowId(campaign._id)}
                    className="h-8 flex-1 rounded-(--radius-input) border border-primary/40 bg-surface-hover px-3 text-xs font-medium text-primary disabled:opacity-50"
                  >
                    Enviar agora
                  </button>
                )}
                {campaign.status === 'scheduled' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleCancelId(campaign._id)}
                    className="h-8 flex-1 rounded-(--radius-input) border border-border bg-surface-hover px-3 text-xs font-medium text-text disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
                {(campaign.status === 'draft' || campaign.status === 'failed') && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setPendingDeleteId(campaign._id)}
                    className="h-8 flex-1 rounded-(--radius-input) border border-danger/40 bg-surface-hover px-3 text-xs font-medium text-danger disabled:opacity-50"
                  >
                    Excluir
                  </button>
                )}
              </span>
            ),
          }))}
          emptyMessage="Nenhuma campanha encontrada."
        />

        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        <ConfirmDialog
          open={pendingDeleteId !== null}
          title="Excluir campanha"
          message="Esta ação é permanente e não pode ser desfeita. Deseja realmente excluir esta campanha?"
          confirmLabel="Confirmar"
          onConfirm={() => {
            const id = pendingDeleteId;
            setPendingDeleteId(null);
            if (id) void handleDelete(id);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------- detail
  if (view === 'detail') {
    const c = detail ?? (active as PushCampaign | null);
    return (
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setView('list');
              setDetail(null);
            }}
            className="text-sm text-text-muted hover:text-text"
          >
            ← Notificações
          </button>
          <div className="flex gap-2">
            {active && (active.status === 'draft' || active.status === 'scheduled') && (
              <Button onClick={() => void handleSendNow()} disabled={saving}>
                {saving ? <DotsLoader size="sm" color="text-[#111827]" /> : 'Enviar agora'}
              </Button>
            )}
            {active && active.status === 'scheduled' && (
              <Button variant="secondary" onClick={() => void handleCancel()} disabled={saving}>
                Cancelar
              </Button>
            )}
            {active && (active.status === 'draft' || active.status === 'failed') && (
              <Button
                variant="secondary"
                onClick={() => setPendingDeleteId(active._id)}
                disabled={saving}
              >
                Excluir
              </Button>
            )}
          </div>
        </div>

        <h1 className="form-title text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Detalhe da campanha
        </h1>

        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        {detailLoading && <DotsLoader size="lg" />}

        {c && (
          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
                Conteúdo
              </h2>
              <p className="text-sm font-medium text-text">{c.title}</p>
              <p className="mt-1 text-sm text-text-muted">{c.body}</p>
              {c.imageUrl && (
                <img src={c.imageUrl} alt="" className="mt-3 max-h-40 rounded" />
              )}
              {c.deepLink && (
                <p className="mt-2 text-xs text-text-muted">Deep link: {c.deepLink}</p>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
                Status
              </h2>
              <div className="flex items-center gap-2">
                {statusChip(c.status)}
                {c.scheduledFor && (
                  <span className="text-xs text-text-muted">
                    agendada para {new Date(c.scheduledFor).toLocaleString()}
                  </span>
                )}
                {c.sentAt && (
                  <span className="text-xs text-text-muted">
                    enviada em {new Date(c.sentAt).toLocaleString()}
                  </span>
                )}
              </div>
              {c.error && <p className="mt-2 text-sm text-danger">{c.error}</p>}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
                Estatísticas
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-text-muted">Alvo</div>
                  <div className="font-semibold text-text">{c.stats.targeted}</div>
                </div>
                <div>
                  <div className="text-text-muted">Enviados</div>
                  <div className="font-semibold text-text">{c.stats.sent}</div>
                </div>
                <div>
                  <div className="text-text-muted">Falhas</div>
                  <div className="font-semibold text-text">{c.stats.failed}</div>
                </div>
                <div>
                  <div className="text-text-muted">Tokens mortos</div>
                  <div className="font-semibold text-text">{c.stats.deadTokens}</div>
                </div>
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Receipts: {c.receipts?.length ?? 0} • Enviado por: {c.createdByClerkId}
              </p>
            </Card>
          </div>
        )}
        <ConfirmDialog
          open={pendingDeleteId !== null}
          title="Excluir campanha"
          message="Esta ação é permanente e não pode ser desfeita. Deseja realmente excluir esta campanha?"
          confirmLabel="Confirmar"
          onConfirm={() => {
            const id = pendingDeleteId;
            setPendingDeleteId(null);
            if (id) void handleDelete(id);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------- form
  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between gap-3">
        <button type="button" onClick={resetForm} className="text-sm text-text-muted hover:text-text">
          ← Notificações
        </button>
        <div className="flex gap-2">
          <Button type="submit" form="campanha-form" disabled={saving}>
            {saving ? <DotsLoader size="sm" color="text-[#111827]" /> : 'Criar'}
          </Button>
          <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>

      <h1 className="form-title text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
        Nova campanha
      </h1>

      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <form id="campanha-form" onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
            Conteúdo
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                minLength={3}
                maxLength={64}
              />
            </Field>
            <Field label="Imagem (URL https)">
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Corpo">
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
              </Field>
            </div>
            <Field label="Deep link">
              <Select
                value={form.deepLinkMode}
                onChange={(e) => setForm({ ...form, deepLinkMode: e.target.value, deepLinkSegment: '' })}
              >
                <option value="none">Nenhum</option>
                {DEEP_LINK_ROTAS.map((rota) => (
                  <option key={rota.prefixo} value={rota.prefixo}>
                    {rota.prefixo} {rota.exato ? '' : '(+ id)'}
                  </option>
                ))}
              </Select>
            </Field>
            {!DEEP_LINK_ROTAS.find((r) => r.prefixo === form.deepLinkMode)?.exato &&
              form.deepLinkMode !== 'none' && (
                <Field label="Segmento do deep link">
                  <Input
                    value={form.deepLinkSegment}
                    onChange={(e) => setForm({ ...form, deepLinkSegment: e.target.value })}
                    placeholder="id ou slug"
                  />
                </Field>
              )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
            Segmento
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Destinatários">
              <Select
                value={form.segmentKind}
                onChange={(e) =>
                  setForm({ ...form, segmentKind: e.target.value as PushCampaignSegment['kind'], userIds: [] })
                }
              >
                {SEGMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            {(form.segmentKind === 'user' || form.segmentKind === 'users') && (
              <div className="sm:col-span-2">
                <Field label="Buscar usuários">
                  <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Buscar usuário…" />
                </Field>
                <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border bg-surface p-2">
                  {usersLoading && <DotsLoader size="sm" />}
                  {!usersLoading && users.length === 0 && (
                    <p className="text-xs text-text-muted">Nenhum usuário.</p>
                  )}
                  {users.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 py-1 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={form.userIds.includes(u._id)}
                        onChange={() => toggleUser(u._id)}
                      />
                      <span>{u.name ?? u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.segmentKind === 'city' && (
              <Field label="Cidade">
                <Select
                  value={form.cityId}
                  onChange={(e) => setForm({ ...form, cityId: e.target.value })}
                >
                  <option value="">Selecione…</option>
                  {cities.map((city) => (
                    <option key={city._id} value={city._id}>
                      {city.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {form.segmentKind === 'plan' && (
              <Field label="Plano">
                <Select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value as 'basic' | 'premium' })}
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </Select>
              </Field>
            )}

            {form.segmentKind === 'favorites' && (
              <>
                <Field label="Buscar empresa">
                  <SearchInput value={companySearch} onChange={setCompanySearch} placeholder="Buscar empresa…" />
                </Field>
                <Field label="Empresa">
                  <Select
                    value={form.companyId}
                    onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {filteredCompanies.map((company) => (
                      <option key={company._id} value={company._id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
            Agendamento
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Enviar em (opcional)">
              <Input
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
              />
            </Field>
          </div>
        </Card>
      </form>
    </div>
  );
}