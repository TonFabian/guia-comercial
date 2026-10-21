import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { GuiaColors, Type } from '@/constants/theme';
import { comingSoon } from '@/utils/links';

export function AnnounceCta() {
  return (
    <TouchableOpacity
      style={styles.ctaContainer}
      activeOpacity={0.8}
      onPress={() => comingSoon('Anuncie no Guia')}>
      <Text style={styles.ctaText}>
        Quer sua empresa aqui? <Text style={styles.ctaHighlight}>Clique aqui e anuncie no Guia!</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ctaContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: GuiaColors.textSecondary,
    fontSize: Type.base,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaHighlight: {
    color: GuiaColors.primary,
    fontWeight: '700',
  },
});
