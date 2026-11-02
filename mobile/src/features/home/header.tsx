import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function Header() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.locationButton} activeOpacity={0.7}>
        <Ionicons name="location-sharp" size={18} color={colors.primary} />
        <Text style={styles.locationText}>Sua cidade</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        Busque no maior guia de empresas da cidade.
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
      color: colors.text,
      fontSize: Type.base,
      fontWeight: '600',
    },
    headerTitle: {
      color: colors.text,
      fontSize: Type.title,
      fontWeight: '700',
      lineHeight: 24,
    },
  });
}