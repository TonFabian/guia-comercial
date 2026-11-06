import { isValidObjectId } from 'mongoose';

import { CityModel } from '../models/city.model.js';
import type { City } from '../../../shared/domain.js';

/** Teto duro da listagem pública de cidades (sem paginação). */
const LIMITE_CIDADES = 500;

/**
 * Ids chegam como texto de URL: id malformado vira 404 explícito, sem
 * depender do comportamento do CastError do driver.
 */
function assegurarIdValido(id: string): void {
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('cidade não encontrada'), { statusCode: 404 });
  }
}

export async function listCities(): Promise<City[]> {
  // Retorno em array é o contrato do cliente (mobile/admin) — o teto evita
  // devolver a coleção inteira sem limite.
  return CityModel.find().sort({ name: 1 }).limit(LIMITE_CIDADES).lean<City[]>().exec();
}

export async function getCityBySlug(slug: string) {
  return CityModel.findOne({ slug }).lean();
}

export async function createCity(dto: Partial<City>) {
  return CityModel.create(dto);
}

export async function deleteCity(id: string) {
  assegurarIdValido(id);
  const doc = await CityModel.findByIdAndDelete(id).lean();
  if (!doc) throw Object.assign(new Error('cidade não encontrada'), { statusCode: 404 });
}
