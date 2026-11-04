import { isValidObjectId, Types } from 'mongoose';

import { CategoryModel } from '../models/category.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { findUserByClerkId } from './user.service.js';
import { listAllPushTokens } from './push-token.service.js';
import type { Company } from '../../../shared/domain.js';
import type { CreateCompanyDto, UpdateCompanyDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';
import { geocodeAddress } from '../utils/geocode.js';

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
}

/** Regras de dados para empresas. */

export async function listCompanies(
  filters: CompanyListFilters,
  pagination: Pagination,
): Promise<{ items: Company[]; total: number }> {
  const query: CompanyQuery = {};

  if (typeof filters.category === 'string' && filters.category.length > 0) {
    // Uma ou mais categorias: slugs separados por vírgula. Slug inexistente é
    // ignorado — sem nenhum slug válido a consulta não traz empresa alguma.
    const slugs = filters.category
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean);

    const ids = await Promise.all(slugs.map((slug) => findCategoryIdBySlug(slug)));
    const encontradas = ids.filter((id): id is string => id !== null);

    query.category =
      encontradas.length > 0
        ? { $in: encontradas }
        : new Types.ObjectId().toString();
  }

  if (typeof filters.q === 'string' && filters.q.length > 0) {
    const regex = new RegExp(escapeRegex(filters.q), 'i');
    query.$or = [{ name: regex }, { description: regex }, { address: regex }, { services: regex }];
  }

  if (filters.featured === 'true' || filters.featured === true) {
    query.isFeatured = true;
  } else if (filters.featured === 'false' || filters.featured === false) {
    query.isFeatured = false;
  }

  if (typeof filters.owner === 'string' && filters.owner.length > 0) {
    query.ownerClerkId = filters.owner;
  }

  if (typeof filters.city === 'string' && filters.city.length > 0) {
    const slug = filters.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    const found = await CityModel.findOne({ slug }).lean();
    query.city = found ? found._id : new Types.ObjectId().toString();
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
  let latitude = dto.latitude;
  let longitude = dto.longitude;

  if ((latitude === undefined || longitude === undefined) && dto.address) {
    const coords = await geocodeAddress(dto.address, undefined);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    }
  }

  // Resolve cidade para o documento City (estruturado) ou default Castelo do Piauí.
  let city: string | undefined = typeof dto.city === 'string' ? dto.city : undefined;
  if (typeof city === 'string' || city === undefined) {
    const slug = city
      ? city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
      : 'castelo-do-piaui';
    const found = await CityModel.findOne({ slug }).lean();
    const fallback = await CityModel.findOne({ slug: 'castelo-do-piaui' }).lean();
    city = found ? String(found._id) : fallback ? String(fallback._id) : undefined;
  }

  const resolvedCategory = await resolveCategoryId(dto.category);

  try {
    return await CompanyModel.create({
      ...dto,
      category: resolvedCategory,
      ownerClerkId,
      city: city as Company['city'],
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
  const existing = await CompanyModel.findById(companyId).lean();
  if (!existing) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }

  // Sem auth configurada (modo legado), a autorização fica desabilitada.
  if (!process.env.CLERK_SECRET_KEY) {
    return;
  }

  if (!clerkId) {
    throw Object.assign(new Error('não autenticado'), { statusCode: 401 });
  }

  // Empresa com dono definido: só o próprio dono ou um admin pode mutar.
  if (existing.ownerClerkId) {
    if (existing.ownerClerkId === clerkId) {
      return;
    }
    const user = await findUserByClerkId(clerkId);
    if (user?.role !== 'admin') {
      throw Object.assign(new Error('sem permissão para editar esta empresa'), { statusCode: 403 });
    }
    return;
  }

  // Empresa sem dono (legado): apenas admins, evitando tomada de posse.
  const user = await findUserByClerkId(clerkId);
  if (user?.role !== 'admin') {
    throw Object.assign(new Error('sem permissão para editar esta empresa'), { statusCode: 403 });
  }
}

export async function updateCompany(id: string, dto: UpdateCompanyDto, clerkId?: string) {
  await assertOwner(id, clerkId);

  const previous = await CompanyModel.findById(id).select({ promotion: 1, name: 1 }).lean();

  const update: UpdateCompanyDto & { latitude?: number; longitude?: number; city?: string | unknown } = { ...dto };

  if (typeof update.category === 'string') {
    update.category = await resolveCategoryId(update.category);
  }

  if (typeof update.city === 'string') {
    const slug = update.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    const found = await CityModel.findOne({ slug }).lean();
    const fallback = await CityModel.findOne({ slug: 'castelo-do-piaui' }).lean();
    update.city = found ? String(found._id) : fallback ? String(fallback._id) : undefined;
    if (update.city === undefined) delete (update as Record<string, unknown>).city;
  }

  if (
    (update.latitude === undefined || update.longitude === undefined) &&
    typeof update.address === 'string' &&
    update.address.length > 0
  ) {
    const coords = await geocodeAddress(update.address);
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}