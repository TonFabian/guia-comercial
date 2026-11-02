/**
 * Geocodificação gratuita via Nominatim (OpenStreetMap).
 * Sem chave de API; respeita o limite de 1 req/s do serviço.
 * Retorna { lat, lng } ou null em caso de falha.
 */
export async function geocodeAddress(
  address: string,
  city?: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const query = [address, city].filter(Boolean).join(', ');
  if (!query.trim()) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'guia-comercial/1.0' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const { lat, lon } = data[0];
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}