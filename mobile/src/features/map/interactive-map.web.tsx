import { StyleSheet, Text, View } from 'react-native';

import { Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { InteractiveMapProps } from './interactive-map.types';

export function InteractiveMap(_props: InteractiveMapProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.fallback}>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        O mapa interativo está disponível apenas no app para iOS e Android.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    fontSize: Type.base,
    textAlign: 'center',
  },
});
