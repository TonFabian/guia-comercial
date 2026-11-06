import { Types } from 'mongoose';

import { CityModel } from '../models/city.model.js';
import { PublicUtilityModel } from '../models/public-utility.model.js';
import { assertAdmin } from './user.service.js';
import type { PublicUtility, PublicUtilityCategory } from '../../../shared/domain.js';
import type { CreatePublicUtilityDto, UpdatePublicUtilityDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';
import { lerBooleano, lerEnum, lerTexto } from '../utils/query.js';

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

  const categoriaEnumerada = lerEnum(filters.category, CATEGORIAS, 'category');
  if (categoriaEnumerada !== undefined) {
    // Segunda barreira (defesa em profundidade): o valor que chega aqui já foi
    // validado pelo `lerEnum`; se um dia o filtro for montado por outro
    // caminho, categoria fora do enum não traz serviço nenhum.
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
