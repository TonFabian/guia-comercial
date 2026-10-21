import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { GuiaColors, Spacing, Type } from '@/constants/theme';

export function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.locationButton}>
        <Ionicons name="location-sharp" size={18} color={GuiaColors.primary} />
        <Text style={styles.locationText}>Sua cidade</Text>
        <Ionicons name="chevron-down" size={14} color={GuiaColors.textSecondary} />
      </View>
      <Text style={styles.headerTitle}>
        Busque no maior guia de empresas da cidade.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
    paddingBottom: Spacing.three,
    gap: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  locationText: {
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    fontWeight: '600',
  },
  headerTitle: {
    color: GuiaColors.text,
    fontSize: Type.headline,
    fontWeight: '700',
    lineHeight: 30,
  },
});
