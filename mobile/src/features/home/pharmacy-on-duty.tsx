import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { openCompanyDetails } from '@/features/company/open-company';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { callPhone, openAddress } from '@/utils/links';

export function PharmacyOnDuty({ pharmacy }: { pharmacy: Company | null }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  if (!pharmacy) return null;

  const temEndereco = Boolean(pharmacy.address);
  const temTelefone = Boolean(pharmacy.phone);

  return (
    <View style={styles.pharmacyCard}>
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes de ${pharmacy.name}`}
        onPress={() => openCompanyDetails(pharmacy._id)}
      >
        <View style={styles.pharmacyHeader}>
          <MaterialCommunityIcons name="pill" size={20} color={colors.primary} />
          <Text style={styles.pharmacyTitle}>Farmácia de Plantão Hoje</Text>
        </View>
        <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{'Aberto agora'}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.pharmacyActions}>
        {temEndereco ? (
          <TouchableOpacity
            style={styles.pillDark}
            activeOpacity={0.7}
            onPress={() => pharmacy.address && void openAddress(pharmacy.address)}
          >
            <Ionicons name="map-outline" size={16} color={colors.primary} />
            <Text style={styles.pillDarkText}>Como chegar</Text>
          </TouchableOpacity>
        ) : null}
        {temTelefone ? (
          <TouchableOpacity
            style={styles.pillYellow}
            activeOpacity={0.7}
            onPress={() => pharmacy.phone && void callPhone(pharmacy.phone)}
          >
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
            ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    pharmacyName: {
      color: colors.text,
            ...Typography.h4,
      fontFamily: FontFamily.heading700,
      fontWeight: FontWeight.bold,
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
            ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
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
            ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
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
            ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}
