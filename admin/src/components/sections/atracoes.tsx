import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { useResource } from '../../hooks/use-resource';
import {
  createTouristSpot,
  deleteTouristSpot,
  getTouristSpots,
  updateTouristSpot,
} from '../../services/api';
import type { TouristSpotInput } from '../../services/api';
import type { City, Company, TouristSpot, TouristSpotCategory } from '../../types/domain';
import { filterByText } from '../../utils/filter';
import { cityLabel, citySlug } from '../../utils/labels';
import { Pagination } from '../pagination';
import { RowActions } from '../row-actions';
import { SearchInput } from '../search-input';
import { Table } from '../table';

export interface AtracoesSectionProps {
  cities: City[];
  citiesError: string | null;
  companies: Company[];
  /** Total de empresas no backend (a lista de opções é limitada a 100). */
  companiesTotal: number;
  companiesError: string | null;
}

type EntryFee = 'free' | 'paid' | 'donation';

interface TouristSpotForm {
  name: string;
  slug: string;
  description: string;
  category: TouristSpotCategory;
  photos: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  schedule: { day: number; opens: number; closes: number }[];
  entryFee: EntryFee;
  entryPrice: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  featured: boolean;
  active: boolean;
  order: number;
  relatedCompany: string;
}

const EMPTY_FORM: TouristSpotForm = {
  name: '',
  slug: '',
  description: '',
  category: 'other',
  photos: '',
  address: '',
  city: '',
  latitude: '',
  longitude: '',
  schedule: [],
  entryFee: 'free',
  entryPrice: '',
  phone: '',
  whatsapp: '',
  website: '',
  instagram: '',
  featured: false,
  active: true,
  order: 0,
  relatedCompany: '',
};

const CATEGORY_LABELS: { value: TouristSpotCategory; label: string }[] = [
  { value: 'nature', label: 'Natureza' },
  { value: 'park', label: 'Parque' },
  { value: 'waterfall', label: 'Cachoeira' },
  { value: 'viewpoint', label: 'Mirante' },
  { value: 'museum', label: 'Museu' },
  { value: 'church', label: 'Igreja' },
  { value: 'monument', label: 'Monumento' },
  { value: 'square', label: 'Praça' },
  { value: 'adventure', label: 'Aventura' },
  { value: 'other', label: 'Outro' },
];

const ENTRY_FEE_LABELS: { value: EntryFee; label: string }[] = [
  { value: 'free', label: 'Gratuito' },
  { value: 'paid', label: 'Pago' },
  { value: 'donation', label: 'Doação' },
];

function categoryLabel(category: TouristSpotCategory): string {
  return CATEGORY_LABELS.find((option) => option.value === category)?.label ?? category;
}

function entryLabel(spot: TouristSpot): string {
  if (spot.entryFee === 'paid') return spot.entryPrice ? `Pago — ${spot.entryPrice}` : 'Pago';
  if (spot.entryFee === 'donation') return 'Doação';
  return 'Gratuito';
}

/** Lista de URLs/linhas digitadas em textarea (uma por linha). */
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

export function AtracoesSection({ cities, citiesError, companies, companiesTotal, companiesError }: AtracoesSectionProps) {
  const { items, total, page, pageSize, loading, error, setPage, reload } =
    useResource<TouristSpot>(getTouristSpots);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<TouristSpotForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () =>
      filterByText(
        items,
        search,
        (spot) => `${spot.name} ${spot.slug} ${spot.description} ${spot.address ?? ''}`,
      ),
    [items, search],
  );

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(spot: TouristSpot) {
    setEditingId(spot._id);
    setActionError(null);
    setForm({
      name: spot.name,
      slug: spot.slug,
      description: spot.description,
      category: spot.category,
      photos: (spot.photos ?? []).join('\n'),
      address: spot.address ?? '',
      city: citySlug(spot.city, cities),
      latitude: spot.latitude !== undefined ? String(spot.latitude) : '',
      longitude: spot.longitude !== undefined ? String(spot.longitude) : '',
      schedule: spot.schedule ?? [],
      entryFee: spot.entryFee ?? 'free',
      entryPrice: spot.entryPrice ?? '',
      phone: spot.phone ?? '',
      whatsapp: spot.whatsapp ?? '',
      website: spot.website ?? '',
      instagram: spot.instagram ?? '',
      featured: spot.featured ?? false,
      active: spot.active,
      order: spot.order ?? 0,
      relatedCompany: companyOptionValue(spot.relatedCompany, companies),
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setActionError(null);

    const latitude = parseOptionalNumber(form.latitude);
    const longitude = parseOptionalNumber(form.longitude);

    if ((form.latitude.trim() && latitude === undefined) || (form.longitude.trim() && longitude === undefined)) {
      setActionError('Latitude e longitude devem ser números (ex.: -3.718).');
      return;
    }

    if (form.entryFee === 'paid' && !form.entryPrice.trim()) {
      setActionError('Informe o preço da entrada quando "Entrada" é "Pago".');
      return;
    }

    setSaving(true);

    const payload: TouristSpotInput = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      category: form.category,
      photos: parseLines(form.photos),
      // `null` limpa o campo salvo (padrão do backend para campos anuláveis).
      address: form.address.trim() || null,
      city: form.city || null,
      latitude,
      longitude,
      entryFee: form.entryFee,
      // Omitir preserva o preço já salvo (regra do PUT parcial no backend).
      entryPrice: form.entryFee === 'paid' ? form.entryPrice.trim() : undefined,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      website: form.website.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      featured: form.featured,
      active: form.active,
      order: form.order,
      relatedCompany: form.relatedCompany || null,
    };

    try {
      if (editingId) {
        await updateTouristSpot(editingId, payload);
      } else {
        await createTouristSpot(payload);
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
      await deleteTouristSpot(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
      {companiesError && <p className="text-sm text-danger">Falha ao carregar empresas: {companiesError}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <form onSubmit={handleSubmit} className="mb-4 grid gap-3 rounded-[--radius-card] border border-border bg-surface p-4 shadow-[--shadow-card] sm:grid-cols-2">
        <input
          placeholder="Nome"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <input
          placeholder="Slug (ex.: praca-dos-girassois)"
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
          onChange={(event) => setForm({ ...form, category: event.target.value as TouristSpotCategory })}
        >
          {CATEGORY_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
        <select
          value={form.entryFee}
          onChange={(event) => setForm({ ...form, entryFee: event.target.value as EntryFee })}
        >
          {ENTRY_FEE_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              Entrada: {option.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Preço da entrada (obrigatório se pago)"
          value={form.entryPrice}
          onChange={(event) => setForm({ ...form, entryPrice: event.target.value })}
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
        <select
          value={form.relatedCompany}
          onChange={(event) => setForm({ ...form, relatedCompany: event.target.value })}
        >
          <option value="">Empresa relacionada</option>
          {companies.map((company) => (
            <option key={company._id} value={company._id}>
              {company.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Ordem"
          value={form.order}
          onChange={(event) => setForm({ ...form, order: Number(event.target.value) })}
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
         <fieldset>
           <legend>Horário estruturado (schedule)</legend>
           {form.schedule.map((item, index) => (
             <div key={index}>
               <input type="number" min={0} max={6} value={item.day} onChange={(e) => { const next = [...form.schedule]; next[index] = { ...item, day: Number(e.target.value) }; setForm({ ...form, schedule: next }); }} />
               <input type="time" value={minutesToTime(item.opens)} onChange={(e) => { const next = [...form.schedule]; next[index] = { ...item, opens: timeToMinutes(e.target.value) }; setForm({ ...form, schedule: next }); }} />
               <input type="time" value={minutesToTime(item.closes)} onChange={(e) => { const next = [...form.schedule]; next[index] = { ...item, closes: timeToMinutes(e.target.value) }; setForm({ ...form, schedule: next }); }} />
               <button type="button" onClick={() => setForm({ ...form, schedule: form.schedule.filter((_, i) => i !== index) })}>Remover</button>
             </div>
           ))}
           <button type="button" onClick={() => setForm({ ...form, schedule: [...form.schedule, { day: 0, opens: 0, closes: 0 }] })}>Adicionar dia</button>
         </fieldset>
      </form>
      {companiesTotal > companies.length && (
        <p className="text-xs text-text-muted">
          Exibindo {companies.length} de {companiesTotal} empresas — consulte a seção Empresas para o
          restante.
        </p>
      )}

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar atração…" />
        {search && <span className="text-xs text-text-muted">A busca filtra os itens da página atual.</span>}
      </div>

      <Table
        headers={['Nome', 'Categoria', 'Cidade', 'Entrada', 'Contato', 'Ativo', 'Ações']}
        rows={visible.map((spot) => [
          spot.name,
          categoryLabel(spot.category),
          cityLabel(spot.city),
          entryLabel(spot),
          spot.phone ?? spot.whatsapp ?? '—',
          spot.active ? 'Sim' : 'Não',
          <RowActions
            key={spot._id}
            onEdit={() => startEdit(spot)}
            onDelete={() => void handleDelete(spot._id)}
          />,
        ])}
        emptyMessage="Nenhuma atração turística encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      {loading && <p className="text-xs text-text-muted">Carregando…</p>}
    </>
  );
}
