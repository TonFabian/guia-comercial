import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import { createEvent, deleteEvent, getEvents, updateEvent } from '../../services/api';
import type { TourEventInput } from '../../services/api';
import type { City, Company, TourEvent, TourEventCategory } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { citySlug } from '../../utils/labels';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { checkLabelStyle, errorStyle, formStyle, hintStyle, toolbarStyle } from '../styles';
import { Table } from '../table';

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

export function EventosSection({ cities, citiesError, companies, companiesTotal, companiesError }: EventosSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } =
    useResource<TourEvent>(getEvents);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<TourEventForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
  }

  function startEdit(evento: TourEvent) {
    setEditingId(evento._id);
    setActionError(null);
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
      await deleteEvent(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      {citiesError && <p style={errorStyle}>Falha ao carregar cidades: {citiesError}</p>}
      {companiesError && <p style={errorStyle}>Falha ao carregar empresas: {companiesError}</p>}
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
        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => setForm({ ...form, featured: event.target.checked })}
          />
          Destaque
        </label>
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
        <textarea
          placeholder="Fotos (uma URL por linha)"
          value={form.photos}
          onChange={(event) => setForm({ ...form, photos: event.target.value })}
          style={{ minWidth: 300, minHeight: 60, width: '100%' }}
        />
      </form>
      {companiesTotal > companies.length && (
        <p style={hintStyle}>
          Exibindo {companies.length} de {companiesTotal} empresas — consulte a seção Empresas para o
          restante.
        </p>
      )}

      <div style={toolbarStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar evento…" />
        {search && <span style={hintStyle}>A busca filtra os itens da página atual.</span>}
      </div>

      <Table
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
        emptyMessage="Nenhum evento turístico encontrado."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      <p style={hintStyle}>Os eventos encerrados aparecem na listagem para que possam ser editados ou desativados.</p>
      {loading && <p style={hintStyle}>Carregando…</p>}
    </>
  );
}
