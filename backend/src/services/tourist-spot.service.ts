import { isValidObjectId, Types } from 'mongoose';

import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { TouristSpotModel } from '../models/tourist-spot.model.js';
import { assertAdmin } from './user.service.js';
import type { TouristSpot, TouristSpotCategory } from '../../../shared/domain.js';
import type { CreateTouristSpotDto, UpdateTouristSpotDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';
import { escapeRegex } from '../utils/regex.js';
import { lerBooleano, lerEnum, lerTexto } from '../utils/query.js';
import { convertOpeningHoursToSchedule } from '../utils/opening-hours.js';
import type { ScheduleItem } from '../utils/opening-hours.js';

/** Critério de busca compatível com o filtro aceito pelo model. */
type TouristSpotQuery = {
  category?: TouristSpotCategory | { $in: TouristSpotCategory[] };
  active?: boolean;
  city?: string;
  $or?: Array<Record<string, unknown>>;
};

const CATEGORIAS: TouristSpotCategory[] = [
  'nature',
  'park',
  'waterfall',
  'viewpoint',
  'museum',
  'church',
  'monument',
  'square',
  'adventure',
  'other',
];

export interface TouristSpotListFilters {
  /** categoria do ponto (nature, park, waterfall, ...) */
  category?: unknown;
  /** busca textual em name/description */
  q?: unknown;
  /** true/false para filtrar por ponto ativo */
  active?: unknown;
  /** cidade (slug) */
  city?: unknown;
}

/** Regras de dados dos pontos turísticos (módulo de turismo). */

export async function listTouristSpots(
  filters: TouristSpotListFilters,
  pagination: Pagination,
): Promise<{ items: TouristSpot[]; total: number }> {
  const query: TouristSpotQuery = {};

  const categoriaEnumerada = lerEnum(filters.category, CATEGORIAS, 'category');
  if (categoriaEnumerada !== undefined) {
    // Segunda barreira (defesa em profundidade): o valor que chega aqui já foi
    // validado pelo `lerEnum`; categoria fora do enum não traz ponto nenhum,
    // como no Mongo, que só casa valores do enum.
    query.category = ehCategoria(categoriaEnumerada) ? categoriaEnumerada : { $in: [] };
  }

  const ativo = lerBooleano(filters.active, 'active');
  if (ativo !== undefined) {
    query.active = ativo;
  }

  const cidadeInformada = lerTexto(filters.city, { nome: 'city' });
  if (cidadeInformada !== undefined) {
    const found = await CityModel.findOne({ slug: normalizarSlug(cidadeInformada) }).lean();
    // Slug sem cidade correspondente não derruba a consulta: filtra por um id
    // inexistente, o que devolve uma lista vazia.
    query.city = found ? String(found._id) : new Types.ObjectId().toString();
  }

  const termo = lerTexto(filters.q, { nome: 'q' });
  if (termo !== undefined) {
    // Busca textual em name E description ($or): mesmo padrão de
    // company.service, com a regex sempre escapada (entrada não confiável).
    const regex = new RegExp(escapeRegex(termo), 'i');
    query.$or = [{ name: regex }, { description: regex }];
  }

  const [items, total] = await Promise.all([
    TouristSpotModel.find(query)
      .populate('city')
      // Desempate por _id: order/name podem repetir e, com paginação visível
      // ao usuário, sem desempate o paginador fica indeterminístico
      // (itens pulam ou duplicam entre páginas).
      .sort({ order: 1, name: 1, _id: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<TouristSpot[]>(),
    TouristSpotModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getTouristSpotById(id: string) {
  return TouristSpotModel.findById(id).populate('city').lean();
}

export async function createTouristSpot(
  dto: CreateTouristSpotDto,
  clerkId?: string,
) {
  await assertAdmin(clerkId, 'gerenciar pontos turísticos');

  const existente = await TouristSpotModel.findOne({ slug: dto.slug }).lean();
  if (existente) {
    throw Object.assign(new Error('já existe ponto turístico com este slug'), {
      statusCode: 409,
    });
  }

  const city = await resolverCidade(dto.city);
  const relatedCompany = await resolverEmpresaRelacionada(dto.relatedCompany);

  try {
    return await TouristSpotModel.create({
      ...dto,
      schedule: resolverSchedule(dto.schedule, dto.openingHours),
      city: city as TouristSpot['city'],
      relatedCompany: relatedCompany as TouristSpot['relatedCompany'],
    });
  } catch (error) {
    // Proteção contra corrida no Mongo: o índice único do slug entra antes da
    // checagem explícita feita acima.
    if ((error as { code?: number }).code === 11000) {
      throw Object.assign(new Error('slug já existe'), { statusCode: 409 });
    }
    throw error;
  }
}

export async function updateTouristSpot(
  id: string,
  dto: UpdateTouristSpotDto,
  clerkId?: string,
) {
  await assertAdmin(clerkId, 'gerenciar pontos turísticos');

  const atual = await TouristSpotModel.findById(id).lean();
  if (!atual) {
    throw Object.assign(new Error('ponto turístico não encontrado'), { statusCode: 404 });
  }

  const update: UpdateTouristSpotDto & { city?: string | null; relatedCompany?: string | null } = {
    ...dto,
  };

  const scheduleResolvido = resolverSchedule(update.schedule, update.openingHours);
  if (scheduleResolvido !== undefined || update.openingHours !== undefined) {
    update.schedule = scheduleResolvido ?? [];
  }

  // Invariante reforçada sobre o estado resultante (payload sobrescreve o
  // documento salvo): entrada paga exige preço, mesmo quando o PUT não traz
  // entryPrice porque o doc antigo também não tinha.
  const entryFeeResultante = update.entryFee ?? atual.entryFee;
  const entryPriceResultante = update.entryPrice ?? atual.entryPrice;
  if (entryFeeResultante === 'paid' && !(entryPriceResultante ?? '').trim()) {
    throw Object.assign(new Error('entrada paga exige o preço de entrada (entryPrice)'), {
      statusCode: 422,
    });
  }

  if (typeof update.city === 'string') {
    const city = await resolverCidade(update.city);
    if (city === undefined) {
      delete update.city;
    } else {
      update.city = city;
    }
  }

  if (typeof update.relatedCompany === 'string') {
    const relatedCompany = await resolverEmpresaRelacionada(update.relatedCompany);
    if (relatedCompany === undefined) {
      delete update.relatedCompany;
    } else {
      update.relatedCompany = relatedCompany;
    }
  }

  try {
    return await TouristSpotModel.findByIdAndUpdate(id, update, {
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

export async function deleteTouristSpot(id: string, clerkId?: string): Promise<void> {
  await assertAdmin(clerkId, 'gerenciar pontos turísticos');

  const doc = await TouristSpotModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('ponto turístico não encontrado'), { statusCode: 404 });
  }
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
 * `resolveCategoryId` de company.service). Slug sem empresa correspondente não
 * vira referência solta no documento.
 */
async function resolverEmpresaRelacionada(
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

function ehCategoria(valor: string): valor is TouristSpotCategory {
  return (CATEGORIAS as string[]).includes(valor);
}

function resolverSchedule(
  schedule: CreateTouristSpotDto['schedule'],
  openingHours?: string[],
): ScheduleItem[] | undefined {
  if (schedule !== undefined && schedule.length > 0) return schedule;
  if ((!schedule || schedule.length === 0) && openingHours && openingHours.length > 0) {
    return convertOpeningHoursToSchedule(openingHours);
  }
  return schedule ?? undefined;
}
