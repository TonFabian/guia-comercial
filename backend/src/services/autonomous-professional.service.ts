import { CityModel } from '../models/city.model.js';
import { AutonomousProfessionalModel } from '../models/autonomous-professional.model.js';
import { findUserByClerkId } from './user.service.js';
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

async function assertOwner(id: string, clerkId?: string): Promise<void> {
  const existing = await AutonomousProfessionalModel.findById(id).lean();
  if (!existing) {
    throw Object.assign(new Error('não encontrado'), { statusCode: 404 });
  }

  // Sem auth configurada (modo legado), a autorização fica desabilitada.
  if (!process.env.CLERK_SECRET_KEY) {
    return;
  }

  if (!clerkId) {
    throw Object.assign(new Error('Não autenticado'), { statusCode: 401 });
  }

  if (existing.ownerClerkId) {
    if (existing.ownerClerkId === clerkId) {
      return;
    }
    const user = await findUserByClerkId(clerkId);
    if (user?.role !== 'admin') {
      throw Object.assign(new Error('sem permissão'), { statusCode: 403 });
    }
    return;
  }

  // Sem dono definido (legado): apenas admins.
  const user = await findUserByClerkId(clerkId);
  if (user?.role !== 'admin') {
    throw Object.assign(new Error('sem permissão'), { statusCode: 403 });
  }
}

export async function updateProfessional(id: string, dto: Partial<AutonomousProfessional>, clerkId?: string) {
  await assertOwner(id, clerkId);

  const update: Partial<AutonomousProfessional> & { city?: string | unknown } = { ...dto };

  if (typeof update.city === 'string') {
    const slug = update.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    const found = await CityModel.findOne({ slug }).lean();
    const fallback = await CityModel.findOne({ slug: 'castelo-do-piaui' }).lean();
    update.city = found ? String(found._id) : fallback ? String(fallback._id) : undefined;
    if (update.city === undefined) delete (update as Record<string, unknown>).city;
  }

  try {
    return await AutonomousProfessionalModel.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true }).lean();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw Object.assign(new Error('slug já existe'), { statusCode: 409 });
    }
    throw error;
  }
}

export async function deleteProfessional(id: string, clerkId?: string) {
  const existing = await AutonomousProfessionalModel.findById(id).lean();
  if (!existing) throw Object.assign(new Error('não encontrado'), { statusCode: 404 });

  // Reutiliza a mesma regra de autorização da atualização.
  await assertOwner(id, clerkId);

  await AutonomousProfessionalModel.findByIdAndDelete(id).lean();
}