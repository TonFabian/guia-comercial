import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import type { Company } from '@/types/domain';
import { callPhone, openAddress } from '@/utils/links';

export function PharmacyOnDuty({ pharmacy }: { pharmacy: Company | null }) {
  if (!pharmacy) return null;

  return (
    <View style={styles.pharmacyCard}>
      <View style={styles.pharmacyHeader}>
        <MaterialCommunityIcons name="pill" size={20} color={GuiaColors.primary} />
        <Text style={styles.pharmacyTitle}>Farmácia de Plantão Hoje</Text>
      </View>
      <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{pharmacy.openingHours?.[0] ?? 'Aberto agora'}</Text>
      </View>
      <View style={styles.pharmacyActions}>
        <TouchableOpacity
          style={styles.pillDark}
          activeOpacity={0.7}
          onPress={() => pharmacy.address && void openAddress(pharmacy.address)}>
          <Ionicons name="map-outline" size={16} color={GuiaColors.primary} />
          <Text style={styles.pillDarkText}>Como chegar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pillYellow}
          activeOpacity={0.7}
          onPress={() => pharmacy.phone && void callPhone(pharmacy.phone)}>
          <Ionicons name="call" size={16} color={GuiaColors.background} />
          <Text style={styles.pillYellowText}>Ligar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pharmacyCard: {
    marginHorizontal: 16,
    marginBottom: Spacing.four,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pharmacyTitle: {
    color: GuiaColors.text,
    fontSize: Type.cardTitle,
    fontWeight: '700',
  },
  pharmacyName: {
    color: GuiaColors.text,
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
    backgroundColor: GuiaColors.success,
  },
  statusText: {
    color: GuiaColors.success,
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
    backgroundColor: GuiaColors.surfaceAlt,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: GuiaColors.primary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
  },
  pillDarkText: {
    color: GuiaColors.primary,
    fontSize: Type.body,
    fontWeight: '600',
  },
  pillYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
  },
  pillYellowText: {
    color: GuiaColors.background,
    fontSize: Type.body,
    fontWeight: '700',
  },
});
