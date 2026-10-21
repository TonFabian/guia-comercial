import { isValidObjectId, Types } from 'mongoose';

import { CategoryModel } from '../models/category.model.js';
import { CompanyModel } from '../models/company.model.js';
import type { Company } from '../../../shared/domain.js';
import type { CreateCompanyDto, UpdateCompanyDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';

/** Critério de busca compatível com FilterQuery<Company>. */
type CompanyQuery = {
  category?: string;
  $or?: Array<Record<string, unknown>>;
  isFeatured?: boolean;
};

export interface CompanyListFilters {
  /** slug da categoria */
  category?: unknown;
  /** busca textual em name/description */
  q?: unknown;
  featured?: unknown;
}

/** Regras de dados para empresas. */

export async function listCompanies(
  filters: CompanyListFilters,
  pagination: Pagination,
): Promise<{ items: Company[]; total: number }> {
  const query: CompanyQuery = {};

  // Filtro por slug de categoria: converte o slug para o _id da categoria.
  if (typeof filters.category === 'string' && filters.category.length > 0) {
    const rawCategory = await findCategoryIdBySlug(filters.category);
    // slug inexistente => nenhum resultado
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

export async function createCompany(dto: CreateCompanyDto) {
  try {
    return await CompanyModel.create({ ...dto, category: dto.category });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw Object.assign(new Error('slug já existe'), { statusCode: 409 });
    }
    throw error;
  }
}

export async function updateCompany(id: string, dto: UpdateCompanyDto) {
  return CompanyModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true })
    .populate('category')
    .lean();
}

export async function deleteCompany(id: string) {
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
