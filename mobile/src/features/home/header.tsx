import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function Header({ city }: { city?: string }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.locationButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Cidade atual">
        <Ionicons name="location-sharp" size={18} color={colors.primary} />
        <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">{city ?? 'Castelo do Piauí'}</Text>
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
            ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
      maxWidth: 180,
      flexShrink: 1,
    },
    headerTitle: {
      color: colors.text,
            ...Typography.h4,
      fontFamily: FontFamily.heading700,
      fontWeight: FontWeight.bold,    },
  });
}