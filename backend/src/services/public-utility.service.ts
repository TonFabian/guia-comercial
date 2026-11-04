import { Types } from 'mongoose';

import { CityModel } from '../models/city.model.js';
import { PublicUtilityModel } from '../models/public-utility.model.js';
import { assertAdmin } from './user.service.js';
import type { PublicUtility, PublicUtilityCategory } from '../../../shared/domain.js';
import type { CreatePublicUtilityDto, UpdatePublicUtilityDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';

/** Critério de busca compatível com o filtro aceito pelo model. */
type PublicUtilityQuery = {
  category?: PublicUtilityCategory | { $in: PublicUtilityCategory[] };
  active?: boolean;
  city?: string;
};

const CATEGORIAS: PublicUtilityCategory[] = [
  'emergency',
  'health',
  'civil',
  'sanitation',
];

export interface PublicUtilityListFilters {
  /** categoria do serviço (emergency, health, civil, sanitation) */
  category?: unknown;
  /** true/false para filtrar por serviço ativo */
  active?: unknown;
  /** cidade (slug) */
  city?: unknown;
}

/** Regras de dados dos serviços de utilidade pública. */

export async function listPublicUtilities(
  filters: PublicUtilityListFilters,
  pagination: Pagination,
): Promise<{ items: PublicUtility[]; total: number }> {
  const query: PublicUtilityQuery = {};

  if (typeof filters.category === 'string' && filters.category.trim().length > 0) {
    const categoria = filters.category.trim();
    // Categoria fora da lista não traz serviço nenhum, como no Mongo, que só
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

  const [items, total] = await Promise.all([
    PublicUtilityModel.find(query)
      .populate('city')
      .sort({ order: 1, name: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<PublicUtility[]>(),
    PublicUtilityModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getPublicUtilityById(id: string) {
  return PublicUtilityModel.findById(id).populate('city').lean();
}

export async function createPublicUtility(
  dto: CreatePublicUtilityDto,
  clerkId?: string,
) {
  await assertAdmin(clerkId, 'gerenciar serviços públicos');
  const city = await resolverCidade(dto.city);

  return PublicUtilityModel.create({ ...dto, city });
}

export async function updatePublicUtility(
  id: string,
  dto: UpdatePublicUtilityDto,
  clerkId?: string,
) {
  await assertAdmin(clerkId, 'gerenciar serviços públicos');

  const update: UpdatePublicUtilityDto = { ...dto };
  if (typeof update.city === 'string') {
    const city = await resolverCidade(update.city);
    if (city === undefined) {
      delete update.city;
    } else {
      update.city = city;
    }
  }
  return PublicUtilityModel.findByIdAndUpdate(id, update, {
    returnDocument: 'after',
    runValidators: true,
  })
    .populate('city')
    .lean();
}

export async function deletePublicUtility(id: string, clerkId?: string): Promise<void> {
  await assertAdmin(clerkId, 'gerenciar serviços públicos');

  const doc = await PublicUtilityModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('serviço público não encontrado'), { statusCode: 404 });
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

function normalizarSlug(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

function ehCategoria(valor: string): valor is PublicUtilityCategory {
  return (CATEGORIAS as string[]).includes(valor);
}
