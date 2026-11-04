import type { City } from '@/types/domain';

/** Extrai o nome da cidade a partir de `string | City`. */
export function cityName(city: string | City | null | undefined): string {
  if (!city) return '';
  if (typeof city === 'string') return city;
  return city.name ?? '';
}

/** Normaliza o nome da cidade para comparação (sem acentos, minúsculo). */
export function normalizeCity(value: string | City | null | undefined): string {
  const name = cityName(value);
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}