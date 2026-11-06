/**
 * Ações de contato/navegação externa usadas nos cards (ligar, WhatsApp,
 * abrir mapa). Silencia erros de Linking que podem ocorrer em ambientes sem
 * handler para a URL.
 */
import { Alert, Linking, Platform } from 'react-native';

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

/**
 * Abre um link externo (site, Instagram, Facebook, ingresso).
 *
 * Defesa em profundidade: o campo pode vir de um admin (ou de uma conta
 * comprometida), então NENHUMA string é aberta sem validação. Aceita-se
 * somente URLs http(s) válidas, sem caracteres de controle, com host real e
 * sem endereços internos/loopback. A URL aberta é a NORMALIZADA (não o
 * input bruto), para evitar bypass por diferenças de parsing.
 */
export async function openExternalUrl(url: string, title: string) {
  const segura = urlSegura(url);
  if (!segura) {
    Alert.alert(title, `Não foi possível abrir o link (${url}).`);
    return;
  }
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // noopener: impede a página aberta de manipular esta janela (tabnabbing).
      // noreferrer: não envia o Referer (privacidade; implica noopener).
      window.open(segura, '_blank', 'noopener,noreferrer');
    } else {
      await Linking.openURL(segura);
    }
  } catch {
    Alert.alert(title, `Não foi possível abrir o link (${url}).`);
  }
}

/** Aceita apenas URLs http(s) válidas e seguras. */
function urlSegura(url: string): string | null {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) {
    return null;
  }
  // Rejeita caracteres de controle e nulos (tentativas de burlar o parser
  // ou de injetar quebras de linha no alerta/OS handler).
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      return null;
    }
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }
  if (!parsed.hostname) {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  // Bloqueia endereços internos/loopback (defesa em profundidade).
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return null;
  }
  return parsed.href;
}
