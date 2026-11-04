import { CityModel } from '../models/city.model.js';
import type { City } from '../../../shared/domain.js';

export async function listCities(): Promise<City[]> {
  return CityModel.find().sort({ name: 1 }).lean<City[]>().exec();
}

export async function getCityBySlug(slug: string) {
  return CityModel.findOne({ slug }).lean();
}

export async function createCity(dto: Partial<City>) {
  return CityModel.create(dto);
}

export async function deleteCity(id: string) {
  const doc = await CityModel.findByIdAndDelete(id).lean();
  if (!doc) throw Object.assign(new Error('cidade não encontrada'), { statusCode: 404 });
}