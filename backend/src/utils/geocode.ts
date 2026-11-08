/**
 * Geocodificação gratuita via Nominatim (OpenStreetMap).
 * Sem chave de API; respeita o limite de 1 req/s do serviço.
 * Retorna { latitude, longitude } ou null em caso de falha.
 */

type NominatimResult = {
  lat: string;
  lon: string;
  address?: Record<string, string>;
};

/** Remove ruído de digitação de endereço ("nº", "n°", "no") que atrapalha o geocoder. */
function limparEndereco(address: string): string {
  return address.replace(/\bn[º°o.]\s*/gi, '').trim();
}

/** Compara textos sem acento, em minúsculas. */
function mesmoLugar(a: string, b: string): boolean {
  const normalizar = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalizar(a) === normalizar(b);
}

/**
 * Valida o resultado contra a cidade informada: sem essa checagem o Nominatim
 * devolve o centro do país/estado como fallback quando não encontra a rua,
 * gerando coordenadas a quilômetros de distância.
 */
function resultadoPertenceCidade(
  dados: NominatimResult,
  city?: string,
): boolean {
  if (!city) return true;
  const partesEndereço = dados.address ?? {};
  const lugares = [
    partesEndereço.town,
    partesEndereço.city,
    partesEndereço.village,
    partesEndereço.municipality,
    partesEndereço.city_district,
  ].filter(Boolean);
  return lugares.some((lugar) => mesmoLugar(lugar, city));
}

export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
): Promise<{ latitude: number; longitude: number } | null> {
  // CIDADE e ESTADO entram na query e o país é fixado (countrycodes=br):
  // endereço sozinho é ambíguo e o fallback sem vínculo dá coordenadas erradas.
  const query = [limparEndereco(address), city, state, 'Brasil']
    .filter(Boolean)
    .join(', ');
  if (!query.trim()) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&format=json&limit=1&countrycodes=br&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'guia-comercial/1.0' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as NominatimResult[];
    if (!Array.isArray(data) || data.length === 0) return null;
    const primeiro = data[0];
    if (!resultadoPertenceCidade(primeiro, city)) return null;
    const latitude = Number(primeiro.lat);
    const longitude = Number(primeiro.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}
