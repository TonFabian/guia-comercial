import { isValidObjectId } from 'mongoose';

import { CityModel } from '../models/city.model.js';
import { AutonomousProfessionalModel } from '../models/autonomous-professional.model.js';
import { assertOwnerOrAdmin } from './authorization.service.js';
import type { AutonomousProfessional } from '../../../shared/domain.js';
import type { Pagination } from '../utils/http.js';

/**
 * Ids chegam como texto de URL: id malformado vira 404 explícito, sem
 * depender do comportamento do CastError do driver.
 */
function assegurarIdValido(id: string): void {
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('não encontrado'), { statusCode: 404 });
  }
}

export async function listProfessionals(pagination: Pagination): Promise<{ items: AutonomousProfessional[]; total: number }> {
  const [items, total] = await Promise.all([
    AutonomousProfessionalModel.find().sort({ name: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    AutonomousProfessionalModel.countDocuments(),
  ]);
  return { items, total };
}

export async function getProfessionalById(id: string) {
  assegurarIdValido(id);
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
  // O dono é SEMPRE o clerk da sessão: `ownerClerkId` é injetado DEPOIS do
  // spread — qualquer valor homônimo no payload já está descartado pelo zod e
  // aqui vem sobrescrito (nunca o cliente escreve a titularidade).
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
  await assertOwnerOrAdmin({
    resourceId: id,
    clerkId,
    findResource: async (resourceId) => {
      const existing = await AutonomousProfessionalModel.findById(resourceId).lean();
      if (!existing) return { exists: false };
      return { exists: true, ownerClerkId: existing.ownerClerkId };
    },
    notFoundMessage: 'profissional não encontrado',
    forbiddenMessage: 'sem permissão',
  });
}

export async function updateProfessional(id: string, dto: Partial<AutonomousProfessional>, clerkId?: string) {
  await assertOwner(id, clerkId);

  const update: Partial<AutonomousProfessional> & { city?: string | unknown } = { ...dto };

  // O dono nunca vem do payload (mass assignment trocaria a titularidade):
  // o zod já descarta o campo na rota; aqui é a barreira de quem consome o
  // service diretamente.
  delete update.ownerClerkId;

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