import { isValidObjectId, Types } from 'mongoose';

import { CategoryModel } from '../models/category.model.js';
import { CompanyModel } from '../models/company.model.js';
import { findUserByClerkId } from './user.service.js';
import type { Company } from '../../../shared/domain.js';
import type { CreateCompanyDto, UpdateCompanyDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';
import { geocodeAddress } from '../utils/geocode.js';

/** Critério de busca compatível com FilterQuery<Company>. */
type CompanyQuery = {
  category?: string;
  $or?: Array<Record<string, unknown>>;
  isFeatured?: boolean;
  ownerClerkId?: string;
};

export interface CompanyListFilters {
  /** slug da categoria */
  category?: unknown;
  /** busca textual em name/description */
  q?: unknown;
  featured?: unknown;
  /** clerkId do dono (filtro "minhas empresas") */
  owner?: unknown;
}

/** Regras de dados para empresas. */

export async function listCompanies(
  filters: CompanyListFilters,
  pagination: Pagination,
): Promise<{ items: Company[]; total: number }> {
  const query: CompanyQuery = {};

  if (typeof filters.category === 'string' && filters.category.length > 0) {
    const rawCategory = await findCategoryIdBySlug(filters.category);
    query.category = rawCategory ?? new Types.ObjectId().toString();
  }

  if (typeof filters.q === 'string' && filters.q.length > 0) {
    const regex = new RegExp(escapeRegex(filters.q), 'i');
    query.$or = [{ name: regex }, { description: regex }];
  }

  if (filters.featured === 'true' || filters.featured === true) {
    query.isFeatured = true;
  } else if (filters.featured === 'false' || filters.featured === false) {
    query.isFeatured = false;
  }

  if (typeof filters.owner === 'string' && filters.owner.length > 0) {
    query.ownerClerkId = filters.owner;
  }

  const [items, total] = await Promise.all([
    CompanyModel.find(query)
      .populate('category')
      .sort({ isFeatured: -1, name: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    CompanyModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getCompanyById(id: string) {
  return CompanyModel.findById(id).populate('category').lean();
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

  try {
    return await CompanyModel.create({
      ...dto,
      category: dto.category,
      ownerClerkId,
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
  if (existing.ownerClerkId && clerkId && existing.ownerClerkId !== clerkId) {
    const user = await findUserByClerkId(clerkId);
    if (user?.role !== 'admin') {
      throw Object.assign(new Error('sem permissão para editar esta empresa'), { statusCode: 403 });
    }
  }
}

export async function updateCompany(id: string, dto: UpdateCompanyDto, clerkId?: string) {
  await assertOwner(id, clerkId);

  const update: UpdateCompanyDto & { latitude?: number; longitude?: number } = { ...dto };

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

  return CompanyModel.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true })
    .populate('category')
    .lean();
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

// helpers

async function findCategoryIdBySlug(slug: string): Promise<string | null> {
  const category = await CategoryModel.findOne({ slug }).select({ _id: 1 }).lean();
  return category ? String(category._id) : null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}