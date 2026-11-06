/**
 * Ações e linhas de informação reutilizadas pelas telas de detalhe do módulo
 * de turismo (atração e evento): endereço com "Como chegar" e contatos com
 * aviso de acesso quando o dado comercial veio redigido (`null`).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { City } from '@/types/domain';
import { callPhone, openAddress, openMapLink, openWhatsApp } from '@/utils/links';
import { cityName } from '@/utils/city';

type TourismAddressProps = {
  /** Endereço textual do lugar (rua, número, bairro...). */
  address?: string | null;
  /** Cidade, como texto ou objeto populado pela API. */
  city?: string | City;
  /** Coordenadas do lugar (têm prioridade sobre o endereço no mapa). */
  latitude?: number;
  longitude?: number;
};

/** Linha de endereço com botão "Como chegar". Some quando não há dado nenhum. */
export function TourismAddressRow({ address, city, latitude, longitude }: TourismAddressProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const temCoordenada = latitude !== undefined && longitude !== undefined;
  if (!temCoordenada && !address) return null;

  const lugar = [cityName(city), address ?? ''].filter(Boolean).join(' · ');

  const abrirMapa = () => {
    if (temCoordenada) {
      void openMapLink(`https://maps.google.com/?q=${latitude},${longitude}`);
      return;
    }
    if (address) void openAddress(address);
  };

  return (
    <View style={styles.addressRow}>
      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
      <Text style={styles.addressText} numberOfLines={2}>
        {lugar}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
        onPress={abrirMapa}
        accessibilityRole="button"
        accessibilityLabel="Como chegar"
      >
        <Text style={styles.mapButtonText}>Como chegar</Text>
      </Pressable>
    </View>
  );
}

type TourismContactProps = {
  whatsapp?: string | null;
  phone?: string | null;
};

/**
 * Botões de contato (WhatsApp e ligação). Quando o backend redige o dado
 * comercial, mostra o aviso de que é preciso entrar na conta.
 */
export function TourismContactActions({ whatsapp, phone }: TourismContactProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  if (!whatsapp && !phone) return <ContactHintRow />;

  return (
    <View style={styles.contactRow}>
      {whatsapp ? (
        <Pressable
          style={({ pressed }) => [styles.whatsappButton, pressed && styles.pressed]}
          onPress={() => void openWhatsApp(whatsapp)}
          accessibilityRole="button"
          accessibilityLabel="Falar no WhatsApp"
        >
          <MaterialCommunityIcons name="whatsapp" size={18} color={colors.background} />
          <Text style={styles.whatsappText}>WhatsApp</Text>
        </Pressable>
      ) : null}

      {phone ? (
        <Pressable
          style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
          onPress={() => void callPhone(phone)}
          accessibilityRole="button"
          accessibilityLabel="Ligar"
        >
          <Ionicons name="call" size={16} color={colors.background} />
          <Text style={styles.callText}>Ligar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    addressText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: Type.body,
      lineHeight: 18,
    },
    mapButton: {
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
    },
    mapButtonText: {
      color: colors.background,
      fontSize: Type.small,
      fontWeight: '800',
    },
    contactRow: {
      flexDirection: 'row',
      gap: Spacing.two,
    },
    whatsappButton: {
      flex: 1.6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      backgroundColor: colors.whatsapp,
      borderRadius: Radius.detailCard,
      paddingVertical: Spacing.two + Spacing.two,
    },
    whatsappText: {
      color: colors.background,
      fontSize: Type.base,
      fontWeight: '800',
    },
    callButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      backgroundColor: colors.primary,
      borderRadius: Radius.detailCard,
      paddingVertical: Spacing.two + Spacing.two,
    },
    callText: {
      color: colors.background,
      fontSize: Type.base,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
