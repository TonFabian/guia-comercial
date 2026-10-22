import { isValidObjectId } from 'mongoose';

import { CategoryModel } from '../models/category.model.js';
import type { CreateCategoryDto, UpdateCategoryDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';

/** Regras de dados para categorias. */

export async function listCategories(pagination: Pagination) {
  const [items, total] = await Promise.all([
    CategoryModel.find().sort({ order: 1, name: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    CategoryModel.countDocuments(),
  ]);
  return { items, total };
}

export async function getCategoryById(id: string) {
  return CategoryModel.findById(id).lean();
}

export async function createCategory(dto: CreateCategoryDto) {
  try {
    return await CategoryModel.create(dto);
  } catch (error) {
    // Detecta violação de índice único no slug para devolver 409 com contexto.
    if ((error as { code?: number }).code === 11000) {
      throw Object.assign(new Error('slug já existe'), { statusCode: 409 });
    }
    throw error;
  }
}

export async function updateCategory(id: string, dto: UpdateCategoryDto) {
  return CategoryModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).lean();
}

export async function deleteCategory(id: string) {
  const doc = await CategoryModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('categoria não encontrada'), { statusCode: 404 });
  }
}

/** Ids nulos/inválidos são tratados como 404 pelo middleware. */
export function isObjectId(value: string): boolean {
  return isValidObjectId(value);
}
