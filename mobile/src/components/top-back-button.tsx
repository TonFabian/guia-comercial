import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

import { FontFamily, FontWeight, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

type Props = {
  onPress?: () => void;
  label?: string;
};

/**
 * Botão "Voltar" do topo das telas. Área de toque no mínimo 44×44 (Apple HIG)
 * com hitSlop extra — o texto curto tinha alvo de clique improvável no app.
 */
export function TopBackButton({ onPress, label = '← Voltar' }: Props) {
  const colors = useThemeColors();
  const voltar =
    onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={voltar}
      hitSlop={12}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    >
      <Text style={[styles.text, { color: colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  text: {
    ...Typography.body,
    fontFamily: FontFamily.body600,
    fontWeight: FontWeight.semibold,
  },
});
