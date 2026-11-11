import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { toast } from 'sonner';
import { createEvent, deleteEvent, getEvents, getTouristSpots, updateEvent } from '../../services/api';
import type { TourEventInput } from '../../services/api';
import type { City, Company, TourEvent, TourEventCategory, TourEventScheduleItem, TouristSpot } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { citySlug } from '../../utils/labels';
import { ScheduleEditor } from '../schedule-editor';
import type { TourEventScheduleItemForm } from '../schedule-editor';
import { ehDataDeCalendario, validarProgramacao } from '../schedule-editor';
import { spotOptionValue } from '../../utils/spot-option';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';
import { DotsLoader } from '../ui/loading';
import { Button } from '../ui/button';

export interface EventosSectionProps {
  cities: City[];
  citiesError: string | null;
  companies: Company[];
  /** Total de empresas no backend (a lista de opções é limitada a 100). */
  companiesTotal: number;
  companiesError: string | null;
}

type Ticket = 'free' | 'paid';

interface TourEventForm {
  name: string;
  slug: string;
  description: string;
  category: TourEventCategory;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  organizer: string;
  organizerCompany: string;
  ticket: Ticket;
  ticketPrice: string;
  ticketUrl: string;
  photos: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  featured: boolean;
  active: boolean;
  schedule: TourEventScheduleItemForm[];
}

const EMPTY_FORM: TourEventForm = {
  name: '',
  slug: '',
  description: '',
  category: 'other',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  address: '',
  city: '',
  latitude: '',
  longitude: '',
  organizer: '',
  organizerCompany: '',
  ticket: 'free',
  ticketPrice: '',
  ticketUrl: '',
  photos: '',
  phone: '',
  whatsapp: '',
  website: '',
  instagram: '',
  featured: false,
  active: true,
  schedule: [],
};

const CATEGORY_LABELS: { value: TourEventCategory; label: string }[] = [
  { value: 'festival', label: 'Festival' },
  { value: 'show', label: 'Show' },
  { value: 'fair', label: 'Feira' },
  { value: 'exhibition', label: 'Exposição' },
  { value: 'sport', label: 'Esporte' },
  { value: 'religious', label: 'Religioso' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'workshop', label: 'Oficina' },
  { value: 'other', label: 'Outro' },
];

const TICKET_LABELS: { value: Ticket; label: string }[] = [
  { value: 'free', label: 'Gratuito' },
  { value: 'paid', label: 'Pago' },
];

// Formato exigido pelo backend (o mesmo do zod em types/dto.ts).
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function categoryLabel(category: TourEventCategory): string {
  return CATEGORY_LABELS.find((option) => option.value === category)?.label ?? category;
}

function ticketLabel(evento: TourEvent): string {
  if (evento.ticket === 'paid') return evento.ticketPrice ? `Pago — ${evento.ticketPrice}` : 'Pago';
  if (evento.ticket === 'free') return 'Gratuito';
  return '—';
}

/**
 * Situação do evento comparada com hoje em America/Fortaleza.
 *
 * As datas são strings YYYY-MM-DD: a ordem lexicográfica É a ordem
 * cronológica — não use `new Date(iso)` para decidir.
 */
function situacao(evento: TourEvent, hoje: string): string {
  if (evento.endDate < hoje) return 'Encerrado';
  if (evento.startDate > hoje) return 'Em breve';
  return 'Acontece agora';
}

/** Data de hoje em America/Fortaleza, no formato YYYY-MM-DD (en-CA produz esse formato). */
function hojeNaFortaleza(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
}

/** Lista de URLs digitadas em textarea (uma por linha). */
function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseOptionalNumber(text: string): number | undefined {
  const value = Number(text.trim());
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Valor do select de empresas para o registro atual.
 *
 * O backend pode ter salvo id ou slug — casa com ambos para pré-preencher.
 */
function companyOptionValue(valor: string | Company | undefined, companies: Company[]): string {
  if (!valor) return '';
  if (typeof valor !== 'string') return valor._id;
  const found = companies.find((option) => option._id === valor || option.slug === valor);
  return found ? found._id : '';
}

/**
 * Valor do select de atrações para um item de programação.
 *
 * O backend pode ter salvo id ou slug — casa com ambos para pré-preencher
 * (mesma regra do select de empresas).
 */
// spotOptionValue vive em src/utils/spot-option.ts (puro, testável).

/** Item do backend → estado do formulário (campos opcionais viram texto). */
function itemSalvoParaFormulario(
  item: TourEventScheduleItem,
  spots: TouristSpot[],
): TourEventScheduleItemForm {
  return {
    date: item.date,
    startTime: item.startTime ?? '',
    endTime: item.endTime ?? '',
    title: item.title,
    description: item.description ?? '',
    stage: item.stage ?? '',
    relatedSpot: spotOptionValue(item.relatedSpot, spots),
    ticket: item.ticket ?? '',
    ticketPrice: item.ticketPrice ?? '',
    ticketUrl: item.ticketUrl ?? '',
  };
}

export function EventosSection({ cities, citiesError, companies, companiesTotal, companiesError }: EventosSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } =
    useResource<TourEvent>(getEvents);
  // Atrações para o select "relatedSpot" dos itens de programação.
  const {
    items: touristSpots,
    total: touristSpotsTotal,
    error: touristSpotsError,
  } = useResource<TouristSpot>(getTouristSpots, 100);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<TourEventForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const hoje = hojeNaFortaleza();

  const visible = useMemo(
    () =>
      filterByText(
        items,
        search,
        (evento) => `${evento.name} ${evento.slug} ${evento.description} ${evento.location ?? ''}`,
      ),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('list');
  }

  /** "Novo evento": formulário em tela dedicada (mesmo padrão das Empresas). */
  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActionError(null);
    setView('form');
  }

  function startEdit(evento: TourEvent) {
    setEditingId(evento._id);
    setActionError(null);
    setView('form');
    setForm({
      name: evento.name,
      slug: evento.slug,
      description: evento.description,
      category: evento.category,
      startDate: evento.startDate,
      endDate: evento.endDate,
      startTime: evento.startTime ?? '',
      endTime: evento.endTime ?? '',
      location: evento.location ?? '',
      address: evento.address ?? '',
      city: citySlug(evento.city, cities),
      latitude: evento.latitude !== undefined ? String(evento.latitude) : '',
      longitude: evento.longitude !== undefined ? String(evento.longitude) : '',
      organizer: evento.organizer ?? '',
      organizerCompany: companyOptionValue(evento.organizerCompany, companies),
      ticket: evento.ticket ?? 'free',
      ticketPrice: evento.ticketPrice ?? '',
      ticketUrl: evento.ticketUrl ?? '',
      photos: (evento.photos ?? []).join('\n'),
      phone: evento.phone ?? '',
      whatsapp: evento.whatsapp ?? '',
      website: evento.website ?? '',
      instagram: evento.instagram ?? '',
      featured: evento.featured ?? false,
      active: evento.active,
      schedule: (evento.schedule ?? []).map((item) => itemSalvoParaFormulario(item, touristSpots)),
    });
  }

  function validarDatas(): string | null {
    if (!DATA_REGEX.test(form.startDate)) {
      return 'Data inicial inválida — use o formato AAAA-MM-DD (ex.: 2026-11-05).';
    }
    if (!DATA_REGEX.test(form.endDate)) {
      return 'Data final inválida — use o formato AAAA-MM-DD (ex.: 2026-11-08).';
    }
    if (form.endDate < form.startDate) {
      return 'A data final deve ser igual ou posterior à data inicial.';
    }
    if (form.startTime && !HORA_REGEX.test(form.startTime)) {
      return 'Horário de início inválido — use o formato HH:mm (ex.: 09:00).';
    }
    if (form.endTime && !HORA_REGEX.test(form.endTime)) {
      return 'Horário de fim inválido — use o formato HH:mm (ex.: 18:00).';
    }
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setActionError(null);

    const erroDatas = validarDatas();
    if (erroDatas) {
      setActionError(erroDatas);
      return;
    }

    const latitude = parseOptionalNumber(form.latitude);
    const longitude = parseOptionalNumber(form.longitude);

    if ((form.latitude.trim() && latitude === undefined) || (form.longitude.trim() && longitude === undefined)) {
      setActionError('Latitude e longitude devem ser números (ex.: -3.718).');
      return;
    }

    if (form.ticket === 'paid' && !form.ticketPrice.trim()) {
      setActionError('Informe o preço do ingresso quando "Ingresso" é "Pago".');
      return;
    }

    if (form.startDate && !ehDataDeCalendario(form.startDate)) {
      setActionError('Data inicial do evento inválida — use o formato AAAA-MM-DD (ex.: 2026-11-05).');
      return;
    }
    if (form.endDate && !ehDataDeCalendario(form.endDate)) {
      setActionError('Data final do evento inválida — use o formato AAAA-MM-DD (ex.: 2026-11-05).');
      return;
    }

    const erroProgramacao = validarProgramacao(form.schedule, form.startDate, form.endDate);
    if (erroProgramacao) {
      setActionError(erroProgramacao);
      return;
    }

    setSaving(true);

    const payload: TourEventInput = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      category: form.category,
      // Data pura YYYY-MM-DD: NUNCA converta para datetime ISO.
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.startTime.trim() || undefined,
      endTime: form.endTime.trim() || undefined,
      location: form.location.trim() || undefined,
      // `null` limpa o campo salvo (padrão do backend para campos anuláveis).
      address: form.address.trim() || null,
      city: form.city || null,
      latitude,
      longitude,
      organizer: form.organizer.trim() || undefined,
      organizerCompany: form.organizerCompany || null,
      ticket: form.ticket,
      // Omitir preserva o preço já salvo (regra do PUT parcial no backend).
      ticketPrice: form.ticket === 'paid' ? form.ticketPrice.trim() : undefined,
      ticketUrl: form.ticketUrl.trim() || undefined,
      photos: parseLines(form.photos),
      schedule: form.schedule.map((item) => ({
        date: item.date,
        startTime: item.startTime.trim() || undefined,
        endTime: item.endTime.trim() || undefined,
        title: item.title.trim(),
        description: item.description.trim() || undefined,
        stage: item.stage.trim() || undefined,
        relatedSpot: item.relatedSpot || undefined,
        ticket: item.ticket || undefined,
        ticketPrice: item.ticket === 'paid' ? item.ticketPrice.trim() : undefined,
        ticketUrl: item.ticketUrl.trim() || undefined,
      })),
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      website: form.website.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      featured: form.featured,
      active: form.active,
    };

    try {
      if (editingId) {
        await updateEvent(editingId, payload);
      } else {
        await createEvent(payload);
      }
      resetForm();
      setPage(1);
      toast.success('Salvo com sucesso.');
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteEvent(id);
      toast.success('Excluído com sucesso.');
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  // Formulário em tela dedicada (mesmo padrão das Empresas): a listagem fica
  // limpa e o form só renderiza quando o usuário cria ou edita.
  const formView = (
    <div className="space-y-4">
      {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
      {companiesError && <p className="text-sm text-danger">Falha ao carregar empresas: {companiesError}</p>}
      {touristSpotsError && <p className="text-sm text-danger">Falha ao carregar atrações: {touristSpotsError}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="flex flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={resetForm}
          className="text-sm text-text-muted hover:text-text"
        >
          ← Eventos
        </button>
        <div className="flex gap-2">
          <Button type="submit" form="evento-form" disabled={saving}>
            {saving ? <DotsLoader size="sm" color="text-[#111827]" /> : editingId ? 'Salvar' : 'Criar'}
          </Button>
          <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
      <h1 className="form-title text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
        {editingId ? 'Editar evento' : 'Novo evento'}
      </h1>
      <form
        id="evento-form"
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-(--radius-card) border border-border bg-surface p-4 shadow-(--shadow-card) sm:grid-cols-2"
      >
        <input
          placeholder="Nome"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <input
          placeholder="Slug (ex.: festa-junina-2026)"
          value={form.slug}
          onChange={(event) => setForm({ ...form, slug: event.target.value })}
          required
        />
        <textarea
          placeholder="Descrição"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          required
          style={{ minWidth: 300, minHeight: 60 }}
        />
        <select
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value as TourEventCategory })}
        >
          {CATEGORY_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Data inicial (AAAA-MM-DD)"
          value={form.startDate}
          onChange={(event) => setForm({ ...form, startDate: event.target.value })}
          required
        />
        <input
          placeholder="Data final (AAAA-MM-DD)"
          value={form.endDate}
          onChange={(event) => setForm({ ...form, endDate: event.target.value })}
          required
        />
        <input
          placeholder="Início (HH:mm)"
          value={form.startTime}
          onChange={(event) => setForm({ ...form, startTime: event.target.value })}
        />
        <input
          placeholder="Fim (HH:mm)"
          value={form.endTime}
          onChange={(event) => setForm({ ...form, endTime: event.target.value })}
        />
        <input
          placeholder="Local (ex.: Praça de eventos)"
          value={form.location}
          onChange={(event) => setForm({ ...form, location: event.target.value })}
        />
        <input
          placeholder="Endereço"
          value={form.address}
          onChange={(event) => setForm({ ...form, address: event.target.value })}
        />
        <select value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })}>
          <option value="">Cidade (vazio = todas)</option>
          {cities.map((city) => (
            <option key={city._id} value={city.slug}>
              {city.name} — {city.state}
            </option>
          ))}
        </select>
        <input
          placeholder="Latitude (ex.: -3.718)"
          value={form.latitude}
          onChange={(event) => setForm({ ...form, latitude: event.target.value })}
        />
        <input
          placeholder="Longitude (ex.: -38.5)"
          value={form.longitude}
          onChange={(event) => setForm({ ...form, longitude: event.target.value })}
        />
        <input
          placeholder="Organizador"
          value={form.organizer}
          onChange={(event) => setForm({ ...form, organizer: event.target.value })}
        />
        <select
          value={form.organizerCompany}
          onChange={(event) => setForm({ ...form, organizerCompany: event.target.value })}
        >
          <option value="">Empresa organizadora</option>
          {companies.map((company) => (
            <option key={company._id} value={company._id}>
              {company.name}
            </option>
          ))}
        </select>
        <select
          value={form.ticket}
          onChange={(event) => setForm({ ...form, ticket: event.target.value as Ticket })}
        >
          {TICKET_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              Ingresso: {option.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Preço do ingresso (obrigatório se pago)"
          value={form.ticketPrice}
          onChange={(event) => setForm({ ...form, ticketPrice: event.target.value })}
        />
        <input
          placeholder="URL do ingresso"
          value={form.ticketUrl}
          onChange={(event) => setForm({ ...form, ticketUrl: event.target.value })}
        />
        <input
          placeholder="Telefone"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <input
          placeholder="WhatsApp"
          value={form.whatsapp}
          onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
        />
        <input
          placeholder="Site"
          value={form.website}
          onChange={(event) => setForm({ ...form, website: event.target.value })}
        />
        <input
          placeholder="Instagram"
          value={form.instagram}
          onChange={(event) => setForm({ ...form, instagram: event.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => setForm({ ...form, featured: event.target.checked })}
          />
          Destaque
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
          />
          Ativo
        </label>
        <textarea
          placeholder="Fotos (uma URL por linha)"
          value={form.photos}
          onChange={(event) => setForm({ ...form, photos: event.target.value })}
          style={{ minWidth: 300, minHeight: 60, width: '100%' }}
        />
        <ScheduleEditor
          items={form.schedule}
          spots={touristSpots}
          startDate={form.startDate}
          endDate={form.endDate}
          onChange={(schedule) => setForm({ ...form, schedule })}
        />
      </form>
      {companiesTotal > companies.length && (
        <p className="text-xs text-text-muted">
          Exibindo {companies.length} de {companiesTotal} empresas — consulte a seção Empresas para o
          restante.
        </p>
      )}
      {touristSpotsTotal > touristSpots.length && (
        <p className="text-xs text-text-muted">
          Exibindo {touristSpots.length} de {touristSpotsTotal} atrações — a lista do select está
          limitada; use a seção Atrações se a atração desejada não aparecer.
        </p>
      )}
    </div>
  );

  if (view === 'form') {
    return formView;
  }

  // Listagem: busca + criação + tabela.
  return (
    <div className="space-y-4">
      {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
      {companiesError && <p className="text-sm text-danger">Falha ao carregar empresas: {companiesError}</p>}
      {touristSpotsError && <p className="text-sm text-danger">Falha ao carregar atrações: {touristSpotsError}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar evento…" />
        {search && <span className="text-xs text-text-muted">A busca filtra os itens da página atual.</span>}
        <Button onClick={startCreate}>+ Novo evento</Button>
      </div>

      <Table
        loading={loading}
        headers={['Nome', 'Categoria', 'Período', 'Local', 'Situação', 'Ingresso', 'Ativo', 'Ações']}
        rows={visible.map((evento) => [
          evento.name,
          categoryLabel(evento.category),
          `${evento.startDate} a ${evento.endDate}`,
          evento.location ?? '—',
          situacao(evento, hoje),
          ticketLabel(evento),
          evento.active ? 'Sim' : 'Não',
          <RowActions
            key={evento._id}
            onEdit={() => startEdit(evento)}
            onDelete={() => void handleDelete(evento._id)}
          />,
        ])}
        mobileRows={visible.map((evento) => ({
          id: evento._id,
          primary: evento.name,
          secondary: `${categoryLabel(evento.category)} • ${evento.startDate} a ${evento.endDate} • ${situacao(evento, hoje)}`,
          actions: (
            <RowActions
              onEdit={() => startEdit(evento)}
              onDelete={() => void handleDelete(evento._id)}
            />
          ),
        }))}
        emptyMessage="Nenhum evento turístico encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      <p className="text-xs text-text-muted">Os eventos encerrados aparecem na listagem para que possam ser editados ou desativados.</p>
    </div>
  );
}
