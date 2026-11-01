import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { comingSoon } from '@/utils/links';

export function AnnounceCta() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <TouchableOpacity
      style={styles.ctaContainer}
      activeOpacity={0.7}
      onPress={() => comingSoon('Anuncie no Guia')}>
      <Text style={styles.ctaText}>
        Quer sua empresa aqui? <Text style={styles.ctaHighlight}>Clique aqui e anuncie no Guia!</Text>
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    ctaContainer: {
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: Spacing.three,
      paddingVertical: 18,
      alignItems: 'center',
    },
    ctaText: {
      color: colors.textSecondary,
      fontSize: Type.base,
      textAlign: 'center',
      lineHeight: 20,
    },
    ctaHighlight: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
}