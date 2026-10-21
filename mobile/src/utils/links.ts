/**
 * Ações de contato/navegação externa usadas nos cards (ligar, WhatsApp,
 * abrir mapa). Silencia erros de Linking que podem ocorrer em ambientes sem
 * handler para a URL.
 */
import { Alert, Linking } from 'react-native';

function toDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function callPhone(phone: string) {
  const url = `tel:${toDigits(phone)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Ligar', `Não foi possível abrir o discador (${url}).`);
  }
}

export async function openWhatsApp(phone: string) {
  const url = `https://wa.me/${toDigits(phone)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('WhatsApp', `Não foi possível abrir o WhatsApp (${url}).`);
  }
}

export async function openAddress(address: string) {
  const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Como chegar', `Não foi possível abrir o mapa (${url}).`);
  }
}

export function comingSoon(title: string) {
  Alert.alert(title, 'Integração em breve.');
}
