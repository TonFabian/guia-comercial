import { BannerModel } from '../models/banner.model.js';
import { isValidObjectId } from 'mongoose';
import type { CreateBannerDto, UpdateBannerDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';
import { assertAdmin } from './user.service.js';

/** Regras de dados para banners. */

export async function listBanners(pagination: Pagination) {
  const [items, total] = await Promise.all([
    BannerModel.find().sort({ order: 1, createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    BannerModel.countDocuments(),
  ]);
  return { items, total };
}

export async function getBannerById(id: string) {
  return BannerModel.findById(id).lean();
}

export async function createBanner(dto: CreateBannerDto, clerkId?: string) {
  await assertAdmin(clerkId, 'gerenciar banners');
  return BannerModel.create(dto);
}

export async function updateBanner(id: string, dto: UpdateBannerDto, clerkId?: string) {
  await assertAdmin(clerkId, 'gerenciar banners');
  return BannerModel.findByIdAndUpdate(id, dto, { returnDocument: "after", runValidators: true }).lean();
}

export async function deleteBanner(id: string, clerkId?: string) {
  await assertAdmin(clerkId, 'gerenciar banners');
  const doc = await BannerModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('banner não encontrado'), { statusCode: 404 });
  }
}

export function isObjectId(value: string): boolean {
  return isValidObjectId(value);
}
