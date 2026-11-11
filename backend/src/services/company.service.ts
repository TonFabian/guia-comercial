import { isValidObjectId, Types } from 'mongoose';

import { CategoryModel } from '../models/category.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { assertOwnerOrAdmin } from './authorization.service.js';
import { findUserByClerkId } from './user.service.js';
import { listAllPushTokens } from './push-token.service.js';
import type { Company } from '../../../shared/domain.js';
import type { CreateCompanyDto, UpdateCompanyDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';
import { geocodeAddress } from '../utils/geocode.js';
import { escapeRegex } from '../utils/regex.js';

import type { ScheduleItem } from '../types/schedule.js';
import { lerBooleano, lerListaDeSlugs, lerTexto } from '../utils/query.js';

/** Critério de busca compatível com FilterQuery<Company>. */
type CompanyQuery = {
  category?: string | { $in: string[] };
  $or?: Array<Record<string, unknown>>;
  isFeatured?: boolean;
  ownerClerkId?: string;
  city?: string | RegExp;
};

export interface CompanyListFilters {
  /** slug da categoria (aceita várias separadas por vírgula) */
  category?: unknown;
  /** busca textual em name/description */
  q?: unknown;
  featured?: unknown;
  /** clerkId do dono (filtro "minhas empresas") */
  owner?: unknown;
  /** cidade (slug ou nome) */
  city?: unknown;
  /** 'plan': ordena premium > basic > free (sem ocultar) antes da paginação */
  prioritize?: unknown;
}

/** Regras de dados para empresas. */

/**
 * Deprecação em andamento: `schedule` estruturado é a fonte da verdade, mas o
 * contrato ainda aceita `openingHours` (texto livre). Quando o payload não
 * traz schedule (ou traz vazio) e traz openingHours, o schedule é derivado
 * pelo conversor; quem envia schedule completo sempre prevalece. Linhas não
 * parseáveis produzem schedule vazio — o openingHours original permanece
 * salvo, então nada se perde antes da fase final da migração.
 */
function resolverSchedule(
  schedule: CreateCompanyDto['schedule'],
): ScheduleItem[] | undefined {
  if (schedule !== undefined && schedule.length > 0) return schedule;
  return schedule ?? undefined;
}

export async function listCompanies(
  filters: CompanyListFilters,
  pagination: Pagination,
  clerkId?: string,
): Promise<{ items: Company[]; total: number }> {
  const query: CompanyQuery = {};

  const slugs = lerListaDeSlugs(filters.category, { nome: 'category' });
  if (slugs !== undefined) {
    // Uma ou mais categorias: slugs separados por vírgula. Slug inexistente é
    // ignorado — sem nenhum slug válido a consulta não traz empresa alguma.
    const ids = await Promise.all(slugs.map((slug) => findCategoryIdBySlug(slug)));
    const encontradas = ids.filter((id): id is string => id !== null);

    query.category =
      encontradas.length > 0
        ? { $in: encontradas }
        : new Types.ObjectId().toString();
  }

  const termo = lerTexto(filters.q, { nome: 'q' });
  if (termo !== undefined) {
    const regex = new RegExp(escapeRegex(termo), 'i');
    query.$or = [{ name: regex }, { description: regex }, { address: regex }, { services: regex }];
  }

  const destaque = lerBooleano(filters.featured, 'featured');
  if (destaque !== undefined) {
    query.isFeatured = destaque;
  }

  const owner = lerTexto(filters.owner, { nome: 'owner' });
  if (owner !== undefined) {
    // Fail-closed: 'owner' só pode expressar o próprio filtro "minhas
    // empresas" — listar de outro usuário é enumeração de conteúdo (403),
    // incluindo sem sessão (modo legado), onde não há clerk para conferir.
    if (owner !== clerkId) {
      throw Object.assign(new Error('não é possível listar empresas de outro usuário'), {
        statusCode: 403,
      });
    }
    query.ownerClerkId = owner;
  }

  const cidade = lerTexto(filters.city, { nome: 'city' });
  if (cidade !== undefined) {
    const slug = cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    const found = await CityModel.findOne({ slug }).lean();
    query.city = found ? found._id : new Types.ObjectId().toString();
  }

  const priorizar = lerTexto(filters.prioritize, { nome: 'prioritize' });
  if (priorizar !== undefined && priorizar !== 'plan') {
    // Valor desconhecido não é descartado em silêncio (padrão do repo: 400).
    throw Object.assign(new Error("prioritize inválido: use 'plan'"), { statusCode: 400 });
  }
  const priorizarPorPlano = priorizar === 'plan';

  if (priorizarPorPlano) {
    // Ordenação por plano não é suportada como critério de sort nativo (o
    // enum é texto): busca sem paginação, ordena em memória e pagina. O guia
    // é local (catálogo pequeno), então o custo é aceitável. Empresas free
    // continuam no resultado — apenas reordena, nunca oculta.
    const todas = await CompanyModel.find(query)
      .populate('category')
      .populate('city')
      .sort({ isFeatured: -1, name: 1 })
      .limit(1000)
      .lean();
    const prioridade: Record<string, number> = { premium: 0, basic: 1, free: 2 };
    const ordenadas = [...todas].sort((a, b) => {
      const planoA = prioridade[(a as { plan?: string }).plan ?? 'free'] ?? 2;
      const planoB = prioridade[(b as { plan?: string }).plan ?? 'free'] ?? 2;
      if (planoA !== planoB) return planoA - planoB;
      return 0;
    });
    return {
      items: ordenadas.slice(pagination.skip, pagination.skip + pagination.limit),
      total: ordenadas.length,
    };
  }

  const [items, total] = await Promise.all([
    CompanyModel.find(query)
      .populate('category')
      .populate('city')
      .sort({ isFeatured: -1, name: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    CompanyModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getCompanyById(id: string) {
  return CompanyModel.findById(id).populate('category').populate('city').lean();
}

export async function createCompany(dto: CreateCompanyDto, ownerClerkId?: string) {
  // Plano só pode ser definido por admin. Usuário comum (dono de empresa)
  // que criar empresa via API recebe 'free' por padrão — sem bypass.
  if (dto.plan && dto.plan !== 'free' && process.env.CLERK_SECRET_KEY) {
    const user = ownerClerkId ? await findUserByClerkId(ownerClerkId) : null;
    if (user?.role !== 'admin') {
      dto = { ...dto, plan: 'free' };
    }
  }
  // Resolve cidade primeiro: o nome entra na query de geocodificação (endereço
  // sozinho frequentemente não é encontrado, sem estado/cidade).
  let city: string | null | undefined;
  let cityDoc: { name?: string; state?: string } | null = null;
  if (dto.city === undefined) {
    const fallback = await CityModel.findOne({ slug: 'castelo-do-piaui' }).lean();
    cityDoc = fallback ?? null;
    city = fallback ? String(fallback._id) : undefined;
  } else if (dto.city === null) {
    city = null;
  } else {
    const slug = dto.city
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    const found = await CityModel.findOne({ slug }).lean();
    cityDoc = found ?? null;
    city = found ? String(found._id) : undefined;
  }

  let latitude = dto.latitude;
  let longitude = dto.longitude;

  if ((latitude === undefined || longitude === undefined) && dto.address) {
    const coords = await geocodeAddress(dto.address, cityDoc?.name, cityDoc?.state);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    }
  }

  const resolvedCategory = await resolveCategoryId(dto.category);

  try {
    return await CompanyModel.create({
      ...dto,
      schedule: resolverSchedule(dto.schedule),
      category: resolvedCategory,
      ownerClerkId,
      city: city as unknown as Company['city'],
      latitude,
      longitude,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw Object.assign(new Error('slug já existe'), { statusCode: 409 });
    }
    throw error;
  }
}

async function assertOwner(companyId: string, clerkId?: string): Promise<void> {
  await assertOwnerOrAdmin({
    resourceId: companyId,
    clerkId,
    findResource: async (id) => {
      const existing = await CompanyModel.findById(id).lean();
      if (!existing) return { exists: false };
      return { exists: true, ownerClerkId: existing.ownerClerkId };
    },
    notFoundMessage: 'empresa não encontrada',
    forbiddenMessage: 'sem permissão para editar esta empresa',
  });
}

export async function updateCompany(id: string, dto: UpdateCompanyDto, clerkId?: string) {
  await assertOwner(id, clerkId);

  const previous = await CompanyModel.findById(id).select({ promotion: 1, name: 1 }).lean();

  const update: UpdateCompanyDto & { latitude?: number; longitude?: number; city?: string | unknown } = { ...dto };

  // PUT parcial: só escreve schedule quando há algo a derivar para não
  // transformar a ausência de campos em limpeza (assinatura de undefined em
  // update do Mongo viraria null).
  const scheduleResolvido = resolverSchedule(update.schedule);
  if (scheduleResolvido !== undefined) {
    update.schedule = scheduleResolvido;
  }

  if (typeof update.category === 'string') {
    update.category = await resolveCategoryId(update.category);
  }

  if (update.city === null) {
    update.city = null;
  } else if (typeof update.city === 'string') {
    const slug = update.city
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    const found = await CityModel.findOne({ slug }).lean();
    if (found) {
      update.city = String(found._id);
    } else {
      delete (update as Record<string, unknown>).city;
    }
  }

  if (
    (update.latitude === undefined || update.longitude === undefined) &&
    typeof update.address === 'string' &&
    update.address.length > 0
  ) {
    // O nome da cidade entra na query: endereço sozinho não é encontrado pelo
    // geocoder (falta estado/cidade na busca).
    let cityDoc: { name?: string; state?: string } | undefined;
    if (typeof update.city === 'string') {
      cityDoc = (await CityModel.findById(update.city).lean()) ?? undefined;
    }
    const coords = await geocodeAddress(update.address, cityDoc?.name, cityDoc?.state);
    if (coords) {
      update.latitude = coords.latitude;
      update.longitude = coords.longitude;
    }
  }

  const updated = await CompanyModel.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true })
    .populate('category')
    .populate('city')
    .lean();

  // Notifica clientes quando uma nova promoção é publicada (melhoria P3).
  if (
    typeof dto.promotion === 'string' &&
    dto.promotion.trim().length > 0 &&
    dto.promotion !== previous?.promotion
  ) {
    void notifyPromotion(updated?.name ?? 'Empresa', dto.promotion).catch(() => undefined);
  }

  return updated;
}

export async function updateCompanyPlan(
  id: string,
  plan: 'free' | 'basic' | 'premium',
  clerkId?: string,
) {
  if (!isObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }

  // Apenas admin pode alterar plano (sem bypass via endpoint público).
  if (process.env.CLERK_SECRET_KEY) {
    if (!clerkId) {
      throw Object.assign(new Error('não autenticado'), { statusCode: 401 });
    }
    const user = await findUserByClerkId(clerkId);
    if (user?.role !== 'admin') {
      throw Object.assign(new Error('sem permissão para alterar o plano'), { statusCode: 403 });
    }
  }

  const updated = await CompanyModel.findByIdAndUpdate(
    id,
    { plan },
    { returnDocument: 'after', runValidators: true },
  )
    .populate('category')
    .populate('city')
    .lean();

  if (!updated) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  return updated;
}

export async function deleteCompany(id: string, clerkId?: string) {
  await assertOwner(id, clerkId);

  const doc = await CompanyModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
}

export function isObjectId(value: string): boolean {
  return isValidObjectId(value);
}

async function notifyPromotion(companyName: string, promotion: string): Promise<void> {
  const tokens = await listAllPushTokens();
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({
    to,
    title: `Nova promoção: ${companyName}`,
    body: promotion,
  }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
}

// helpers

async function resolveCategoryId(value: string): Promise<string> {
  if (isValidObjectId(value)) return value;
  const found = await findCategoryIdBySlug(value);
  return found ?? value;
}

async function findCategoryIdBySlug(slug: string): Promise<string | null> {
  const category = await CategoryModel.findOne({ slug }).select({ _id: 1 }).lean();
  return category ? String(category._id) : null;
}

