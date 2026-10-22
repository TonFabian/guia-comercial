import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';

interface SocialButtonsProps {
  onGoogle: () => void;
  onApple: () => void;
  /** Estado separado: os fluxos sociais podem demorar diferente. */
  googleLoading: boolean;
  appleLoading: boolean;
}

/**
 * Botões sociais (Google em todas as plataformas; Apple só no iOS) no
 * estilo do mock: cards escuros sobre a superfície com a marca.
 */
export function SocialButtons({ onGoogle, onApple, googleLoading, appleLoading }: SocialButtonsProps) {
  if (Platform.OS !== 'ios') {
    return <SocialButton label="Continuar com Google" onPress={onGoogle} loading={googleLoading} />;
  }

  return (
    <View style={styles.row}>
      <SocialButton label="Continuar com Google" onPress={onGoogle} loading={googleLoading} />
      <SocialButton
        label="Continuar com Apple"
        onPress={onApple}
        loading={appleLoading}
        loadingLabel="Conectando…"
      />
    </View>
  );
}

interface SocialButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  loadingLabel?: string;
}

function SocialButton({ label, onPress, loading, loadingLabel }: SocialButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      accessibilityLabel={loading ? loadingLabel ?? label : label}
      accessibilityState={{ busy: loading ?? false }}
      role="button"
      disabled={loading ?? false}
    >
      {loading ? <ActivityIndicator size="small" color={GuiaColors.text} /> : null}
      <Text style={styles.label}>{loading ? loadingLabel ?? label : label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.three - 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  label: {
    color: GuiaColors.text,
    fontSize: Type.base,
    fontWeight: '600',
  },
});
