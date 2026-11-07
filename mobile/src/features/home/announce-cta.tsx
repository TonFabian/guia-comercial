import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Spacing, Typography, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { router } from 'expo-router';

export function AnnounceCta() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <TouchableOpacity
      style={styles.ctaContainer}
      activeOpacity={0.7}
      onPress={() => router.push('/announce')}>
      <Text style={styles.ctaText}>
        Quer sua empresa aqui? <Text style={styles.ctaHighlight}>Clique aqui e anuncie no Guia!</Text>
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    ctaContainer: {
      marginHorizontal: Spacing.three,
      marginTop: 4,
      marginBottom: Spacing.four,
      paddingVertical: 18,
      alignItems: 'center',
    },
    ctaText: {
      color: colors.textSecondary,
      ...Typography.body,
      textAlign: 'center',    },
    ctaHighlight: {
      color: colors.primary,
      fontWeight: FontWeight.semibold,
    },
  });
}