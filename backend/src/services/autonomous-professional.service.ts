import { CityModel } from '../models/city.model.js';
import { AutonomousProfessionalModel } from '../models/autonomous-professional.model.js';
import type { AutonomousProfessional } from '../../../shared/domain.js';
import type { Pagination } from '../utils/http.js';

export async function listProfessionals(pagination: Pagination): Promise<{ items: AutonomousProfessional[]; total: number }> {
  const [items, total] = await Promise.all([
    AutonomousProfessionalModel.find().sort({ name: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    AutonomousProfessionalModel.countDocuments(),
  ]);
  return { items, total };
}

export async function getProfessionalById(id: string) {
  return AutonomousProfessionalModel.findById(id).lean();
}

export async function createProfessional(dto: Partial<AutonomousProfessional>, ownerClerkId?: string) {
  let city = typeof dto.city === 'string' ? dto.city : undefined;
  if (typeof city === 'string' || city === undefined) {
    const slug = city
      ? city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
      : 'castelo-do-piaui';
    const found = await CityModel.findOne({ slug }).lean();
    const fallback = await CityModel.findOne({ slug: 'castelo-do-piaui' }).lean();
    city = found ? String(found._id) : fallback ? String(fallback._id) : undefined;
  }
  try {
    return await AutonomousProfessionalModel.create({ ...dto, ownerClerkId, city });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw Object.assign(new Error('slug já existe'), { statusCode: 409 });
    }
    throw error;
  }
}

export async function updateProfessional(id: string, dto: Partial<AutonomousProfessional>, clerkId?: string) {
  const existing = await AutonomousProfessionalModel.findById(id).lean();
  if (!existing) throw Object.assign(new Error('não encontrado'), { statusCode: 404 });
  if (existing.ownerClerkId && clerkId && existing.ownerClerkId !== clerkId) {
    throw Object.assign(new Error('sem permissão'), { statusCode: 403 });
  }
  return AutonomousProfessionalModel.findByIdAndUpdate(id, dto, { returnDocument: 'after', runValidators: true }).lean();
}

export async function deleteProfessional(id: string, clerkId?: string) {
  const existing = await AutonomousProfessionalModel.findById(id).lean();
  if (!existing) throw Object.assign(new Error('não encontrado'), { statusCode: 404 });
  if (existing.ownerClerkId && clerkId && existing.ownerClerkId !== clerkId) {
    throw Object.assign(new Error('sem permissão'), { statusCode: 403 });
  }
  await AutonomousProfessionalModel.findByIdAndDelete(id).lean();
}