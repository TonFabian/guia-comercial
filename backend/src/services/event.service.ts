import { isValidObjectId, Types } from 'mongoose';

import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { TourEventModel } from '../models/event.model.js';
import { assertAdmin } from './user.service.js';
import { listAllPushTokens } from './push-token.service.js';
import { todayInFortaleza } from '../utils/event-date.js';
import type { TourEvent, TourEventCategory } from '../../../shared/domain.js';
import type { CreateTourEventDto, UpdateTourEventDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';

/** Critério de busca compatível com o filtro aceito pelo model. */
type TourEventQuery = {
  category?: TourEventCategory | { $in: TourEventCategory[] };
  active?: boolean;
  city?: string;
  endDate?: { $gte: string };
};

const CATEGORIAS: TourEventCategory[] = [
  'festival',
  'show',
  'fair',
  'exhibition',
  'sport',
  'religious',
  'cultural',
  'workshop',
  'other',
];

export interface TourEventListFilters {
  /** categoria do evento (festival, show, fair, ...) */
  category?: unknown;
  /** true/false para filtrar por evento ativo */
  active?: unknown;
  /** cidade (slug) */
  city?: unknown;
  /** true para incluir eventos vencidos (endDate < hoje) */
  includePast?: unknown;
}

/** Regras de dados dos eventos turísticos (módulo de turismo). */

export async function listTourEvents(
  filters: TourEventListFilters,
  pagination: Pagination,
): Promise<{ items: TourEvent[]; total: number }> {
  const query: TourEventQuery = {};

  if (typeof filters.category === 'string' && filters.category.trim().length > 0) {
    const categoria = filters.category.trim();
    // Categoria fora da lista não traz evento nenhum, como no Mongo, que só
    // casa valores do enum.
    query.category = ehCategoria(categoria) ? categoria : { $in: [] };
  }

  if (filters.active === 'true' || filters.active === true) {
    query.active = true;
  } else if (filters.active === 'false' || filters.active === false) {
    query.active = false;
  }

  if (typeof filters.city === 'string' && filters.city.trim().length > 0) {
    const found = await CityModel.findOne({ slug: normalizarSlug(filters.city) }).lean();
    // Slug sem cidade correspondente não derruba a consulta: filtra por um id
    // inexistente, o que devolve uma lista vazia.
    query.city = found ? String(found._id) : new Types.ObjectId().toString();
  }

  if (filters.includePast !== 'true') {
    // Vigência por DATA (spec D9): endDate é string YYYY-MM-DD e compara com
    // o dia de Fortaleza também como string — $gte de strings é seguro no
    // formato fixo, e NUNCA se mistura data pura com datetime ISO.
    query.endDate = { $gte: todayInFortaleza() };
  }

  const [items, total] = await Promise.all([
    TourEventModel.find(query)
      .populate('city')
      .sort({ startDate: 1, name: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<TourEvent[]>(),
    TourEventModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getTourEventById(id: string) {
  // Evento vencido continua recuperável por id (200 normal): a tela exibe
  // "Encerrado"; 404 é apenas para id inexistente.
  return TourEventModel.findById(id).populate('city').lean();
}

export async function createTourEvent(
  dto: CreateTourEventDto,
  clerkId?: string,
) {
  await assertAdmin(clerkId, 'gerenciar eventos turísticos');

  const existente = await TourEventModel.findOne({ slug: dto.slug }).lean();
  if (existente) {
    throw Object.assign(new Error('já existe evento turístico com este slug'), {
      statusCode: 409,
    });
  }

  const city = await resolverCidade(dto.city);
  const organizerCompany = await resolverEmpresaOrganizadora(dto.organizerCompany);

  try {
    const criado = await TourEventModel.create({
      ...dto,
      city: city as TourEvent['city'],
      organizerCompany: organizerCompany as TourEvent['organizerCompany'],
    });

    // Push apenas no CREATE (spec D11): falha de push não quebra o POST.
    void notifyNewEvent(criado.name, dto.city).catch(() => undefined);

    return criado;
  } catch (error) {
    // Proteção contra corrida no Mongo: o índice único do slug entra antes da
    // checagem explícita feita acima.
    if ((error as { code?: number }).code === 11000) {
      throw Object.assign(new Error('slug já existe'), { statusCode: 409 });
    }
    throw error;
  }
}

export async function updateTourEvent(
  id: string,
  dto: UpdateTourEventDto,
  clerkId?: string,
) {
  await assertAdmin(clerkId, 'gerenciar eventos turísticos');

  const atual = await TourEventModel.findById(id).lean();
  if (!atual) {
    throw Object.assign(new Error('evento turístico não encontrado'), { statusCode: 404 });
  }

  const update: UpdateTourEventDto & { city?: string | null; organizerCompany?: string | null } = {
    ...dto,
  };

  // Regras cruzadas reforçadas sobre o estado RESULTANTE (payload sobrescreve
  // o documento salvo): um PUT parcial que não traz startDate/endDate ou
  // ticketPrice presume os valores do doc.
  const startDateResultante = update.startDate ?? atual.startDate;
  const endDateResultante = update.endDate ?? atual.endDate;
  if (endDateResultante < startDateResultante) {
    throw Object.assign(
      new Error('endDate resultante deve ser maior ou igual a startDate'),
      { statusCode: 422 },
    );
  }

  const ticketResultante = update.ticket ?? atual.ticket;
  const ticketPriceResultante = update.ticketPrice ?? atual.ticketPrice;
  if (ticketResultante === 'paid' && !(ticketPriceResultante ?? '').trim()) {
    throw Object.assign(
      new Error('ingresso pago exige o preço do ingresso (ticketPrice)'),
      { statusCode: 422 },
    );
  }

  if (typeof update.city === 'string') {
    const city = await resolverCidade(update.city);
    if (city === undefined) {
      delete update.city;
    } else {
      update.city = city;
    }
  }

  if (typeof update.organizerCompany === 'string') {
    const organizerCompany = await resolverEmpresaOrganizadora(update.organizerCompany);
    if (organizerCompany === undefined) {
      delete update.organizerCompany;
    } else {
      update.organizerCompany = organizerCompany;
    }
  }

  try {
    return await TourEventModel.findByIdAndUpdate(id, update, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate('city')
      .lean();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw Object.assign(new Error('slug já existe'), { statusCode: 409 });
    }
    throw error;
  }
}

export async function deleteTourEvent(id: string, clerkId?: string): Promise<void> {
  await assertAdmin(clerkId, 'gerenciar eventos turísticos');

  const doc = await TourEventModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('evento turístico não encontrado'), { statusCode: 404 });
  }
}

/**
 * Notifica os usuários com token registrado sobre um evento novo (spec D11),
 * reusando o padrão `notifyPromotion` de company.service. Disparo apenas no
 * CREATE — PUT e DELETE não notificam.
 */
async function notifyNewEvent(eventName: string, city?: string | null): Promise<void> {
  const tokens = await listAllPushTokens();
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    title: `Novo evento: ${eventName}`,
    body: city ? `${eventName} acontece em ${city}` : 'Confira a agenda de eventos do app',
  }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
}

/** Converte o slug da cidade no id do documento City. */
async function resolverCidade(slug?: string | null): Promise<string | undefined> {
  if (!slug) {
    return undefined;
  }

  const found = await CityModel.findOne({ slug: normalizarSlug(slug) }).lean();
  return found ? String(found._id) : undefined;
}

/**
 * Converte id ou slug da empresa em id do documento Company (padrão
 * `resolverEmpresaRelacionada` de tourist-spot.service). Slug sem empresa
 * correspondente não vira referência solta no documento.
 */
async function resolverEmpresaOrganizadora(
  valor?: string | null,
): Promise<string | undefined> {
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    return undefined;
  }

  if (isValidObjectId(valor)) {
    return valor;
  }

  const found = await CompanyModel.findOne({ slug: normalizarSlug(valor) })
    .select({ _id: 1 })
    .lean();
  return found ? String(found._id) : undefined;
}

function normalizarSlug(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

function ehCategoria(valor: string): valor is TourEventCategory {
  return (CATEGORIAS as string[]).includes(valor);
}
