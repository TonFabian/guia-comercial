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
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Field, Input, Select, Textarea, CheckboxField } from '../ui/input';
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
  const [view, setView] = useState<'list' | 'form'>('list');

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
    setView('list');
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
    setView('form');
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
      address: form.address.trim() || null,
      city: form.city || null,
      latitude,
      longitude,
      entryFee: form.entryFee,
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

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between gap-3">
          <button type="button" onClick={resetForm} className="text-sm text-text-muted hover:text-text">
            ← Atrações
          </button>
          <div className="flex gap-2">
                        <Button type="submit" form="atracao-form" disabled={saving}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
            <Button variant="secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          {editingId ? 'Editar atração' : 'Nova atração'}
        </h1>

        {(citiesError || companiesError || actionError) && (
          <div className="space-y-1 text-sm text-danger">
            {citiesError && <p>Falha ao carregar cidades: {citiesError}</p>}
            {companiesError && <p>Falha ao carregar empresas: {companiesError}</p>}
            {actionError && <p>{actionError}</p>}
          </div>
        )}

        <form id="atracao-form" onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Dados básicos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Slug">
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </Field>
              <Field label="Descrição">
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </Field>
              <Field label="Categoria">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TouristSpotCategory })}>
                  {CATEGORY_LABELS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Endereço">
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label="Cidade">
                <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  <option value="">Cidade (vazio = todas)</option>
                  {cities.map((city) => (
                    <option key={city._id} value={city.slug}>{city.name} — {city.state}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Latitude">
                <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
              </Field>
              <Field label="Longitude">
                <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              </Field>
              <Field label="Entrada">
                <Select value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value as EntryFee })}>
                  {ENTRY_FEE_LABELS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Preço da entrada">
                <Input value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} />
              </Field>
              <Field label="Telefone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </Field>
              <Field label="Site">
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </Field>
              <Field label="Instagram">
                <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
              </Field>
              <Field label="Empresa relacionada">
                <Select value={form.relatedCompany} onChange={(e) => setForm({ ...form, relatedCompany: e.target.value })}>
                  <option value="">Empresa relacionada</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>{company.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Ordem">
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </Field>
              <div className="flex items-center gap-4">
                <CheckboxField label="Destaque" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                <CheckboxField label="Ativo" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Fotos
            </h2>
            <Field label="Fotos (uma URL por linha)">
              <Textarea value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} />
            </Field>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
              Horário estruturado (schedule)
            </h2>
            <div className="space-y-2">
              {form.schedule.map((item, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[60px_1fr_1fr_auto] sm:items-center">
                  <input type="number" min={0} max={6} value={item.day} onChange={(e) => { const next = [...form.schedule]; next[index] = { ...item, day: Number(e.target.value) }; setForm({ ...form, schedule: next }); }} className="h-10 rounded-[--radius-input] border border-border bg-surface px-2 text-sm" />
                  <input type="time" value={minutesToTime(item.opens)} onChange={(e) => { const next = [...form.schedule]; next[index] = { ...item, opens: timeToMinutes(e.target.value) }; setForm({ ...form, schedule: next }); }} className="h-10 rounded-[--radius-input] border border-border bg-surface px-2 text-sm" />
                  <input type="time" value={minutesToTime(item.closes)} onChange={(e) => { const next = [...form.schedule]; next[index] = { ...item, closes: timeToMinutes(e.target.value) }; setForm({ ...form, schedule: next }); }} className="h-10 rounded-[--radius-input] border border-border bg-surface px-2 text-sm" />
                  <button type="button" onClick={() => setForm({ ...form, schedule: form.schedule.filter((_, i) => i !== index) })} className="h-10 rounded-[--radius-input] border border-danger/30 bg-danger/10 px-2 text-xs text-danger">Remover</button>
                </div>
              ))}
              <Button variant="secondary" type="button" onClick={() => setForm({ ...form, schedule: [...form.schedule, { day: 0, opens: 0, closes: 0 }] })}>
                Adicionar dia
              </Button>
            </div>
          </Card>
        </form>

        {companiesTotal > companies.length && (
          <p className="text-xs text-text-muted">
            Exibindo {companies.length} de {companiesTotal} empresas — consulte a seção Empresas para o
            restante.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {citiesError && <p className="text-sm text-danger">Falha ao carregar cidades: {citiesError}</p>}
      {companiesError && <p className="text-sm text-danger">Falha ao carregar empresas: {companiesError}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar atração…" />
        <Button
          onClick={() => {
            resetForm();
            setForm(EMPTY_FORM);
            setView('form');
          }}
        >
          + Nova atração
        </Button>
      </div>
      {search && <p className="text-xs text-text-muted">A busca filtra os itens da página atual.</p>}

      <Table
        loading={loading}
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
        mobileRows={visible.map((spot) => ({
          id: spot._id,
          primary: spot.name,
          secondary: `${categoryLabel(spot.category)} • ${cityLabel(spot.city)} • ${entryLabel(spot)}`,
          actions: (
            <RowActions
              onEdit={() => startEdit(spot)}
              onDelete={() => void handleDelete(spot._id)}
            />
          ),
        }))}
        emptyMessage="Nenhuma atração turística encontrada."
      />

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
    </div>
  );
}