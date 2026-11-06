/**
 * Ações de contato/navegação externa usadas nos cards (ligar, WhatsApp,
 * abrir mapa). Silencia erros de Linking que podem ocorrer em ambientes sem
 * handler para a URL.
 */
import { Alert, Linking } from 'react-native';

import { onlyDigits as toDigits } from './phone';

export async function callPhone(phone: string) {
  const url = `tel:${toDigits(phone)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Ligar', `Não foi possível abrir o discador (${url}).`);
  }
}

export async function openWhatsApp(phone: string, message?: string) {
  const suffix = message ? `?text=${encodeURIComponent(message)}` : '';
  const url = `https://wa.me/${toDigits(phone)}${suffix}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('WhatsApp', `Não foi possível abrir o WhatsApp (${url}).`);
  }
}

export async function openMapLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Como chegar', `Não foi possível abrir o mapa (${url}).`);
  }
}

export async function openAddress(address: string) {
  await openMapLink(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
}

export async function openVideo(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Vídeo', 'Não foi possível abrir o vídeo.');
  }
}

export function comingSoon(title: string) {
  Alert.alert(title, 'Integração em breve.');
}

/** Abre um link externo (site, Instagram, Facebook). */
export async function openExternalUrl(url: string, title: string) {
  if (!ehUrlWeb(url)) {
    // Só http(s) são seguros de abrir: bloqueia javascript:, data:, file: e
    // qualquer coisa que não seja uma URL válida (evita XSS via link armazenado).
    Alert.alert(title, `Não foi possível abrir o link (${url}).`);
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(title, `Não foi possível abrir o link (${url}).`);
  }
}

/** Aceita apenas URLs http(s) — bloqueia javascript:, data:, file:, etc. */
function ehUrlWeb(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}


