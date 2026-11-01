import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { callPhone, openAddress } from '@/utils/links';

export function PharmacyOnDuty({ pharmacy }: { pharmacy: Company | null }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  if (!pharmacy) return null;

  const temEndereco = Boolean(pharmacy.address);
  const temTelefone = Boolean(pharmacy.phone);

  return (
    <View style={styles.pharmacyCard}>
      <View style={styles.pharmacyHeader}>
        <MaterialCommunityIcons name="pill" size={20} color={colors.primary} />
        <Text style={styles.pharmacyTitle}>Farmácia de Plantão Hoje</Text>
      </View>
      <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{pharmacy.openingHours?.[0] ?? 'Aberto agora'}</Text>
      </View>
      <View style={styles.pharmacyActions}>
        {temEndereco ? (
          <TouchableOpacity
            style={styles.pillDark}
            activeOpacity={0.7}
            onPress={() => pharmacy.address && void openAddress(pharmacy.address)}>
            <Ionicons name="map-outline" size={16} color={colors.primary} />
            <Text style={styles.pillDarkText}>Como chegar</Text>
          </TouchableOpacity>
        ) : null}
        {temTelefone ? (
          <TouchableOpacity
            style={styles.pillYellow}
            activeOpacity={0.7}
            onPress={() => pharmacy.phone && void callPhone(pharmacy.phone)}>
            <Ionicons name="call" size={16} color={colors.background} />
            <Text style={styles.pillYellowText}>Ligar</Text>
          </TouchableOpacity>
        ) : null}
        {!temEndereco && !temTelefone ? <ContactHintRow /> : null}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    pharmacyCard: {
      marginHorizontal: 16,
      marginBottom: Spacing.four,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.three,
      gap: Spacing.two,
    },
    pharmacyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pharmacyTitle: {
      color: colors.text,
      fontSize: Type.cardTitle,
      fontWeight: '700',
    },
    pharmacyName: {
      color: colors.text,
      fontSize: Type.title,
      fontWeight: '700',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
    },
    statusText: {
      color: colors.success,
      fontSize: Type.body,
      fontWeight: '600',
    },
    pharmacyActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    pillDark: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: Spacing.three,
    },
    pillDarkText: {
      color: colors.primary,
      fontSize: Type.body,
      fontWeight: '600',
    },
    pillYellow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.three,
    },
    pillYellowText: {
      color: colors.background,
      fontSize: Type.body,
      fontWeight: '700',
    },
  });
}