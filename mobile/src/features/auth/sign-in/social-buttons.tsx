import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ReactNode } from 'react';

import { BrandColors, Radius, Spacing, Type } from '@/constants/theme';

interface SocialButtonsProps {
  onGoogle: () => void;
  onApple: () => void;
  /** Estado separado: os fluxos sociais podem demorar diferente. */
  googleLoading: boolean;
  appleLoading: boolean;
}

/**
 * Botões sociais (Google em todas as plataformas; Apple só no iOS) no padrão
 * de marca de cada provedor: ícone oficial à esquerda, texto e fundo conforme
 * a guideline (Google: fundo branco, ícone colorido; Apple: fundo preto).
 */
export function SocialButtons({ onGoogle, onApple, googleLoading, appleLoading }: SocialButtonsProps) {
  if (Platform.OS !== 'ios') {
    return (
      <SocialLoginButton
        title="Continuar com Google"
        icon={loading => (loading ? <ActivityIndicator size="small" color={BrandColors.googleText} /> : <FontAwesome name="google" size={20} color={BrandColors.googleText} />)}
        backgroundColor={BrandColors.googleBg}
        textColor={BrandColors.googleText}
        loading={googleLoading}
        onPress={onGoogle}
      />
    );
  }

  return (
    <View style={styles.row}>
      <SocialLoginButton
        title="Continuar com Google"
        icon={loading => (loading ? <ActivityIndicator size="small" color={BrandColors.googleText} /> : <FontAwesome name="google" size={20} color={BrandColors.googleText} />)}
        backgroundColor={BrandColors.googleBg}
        textColor={BrandColors.googleText}
        loading={googleLoading}
        onPress={onGoogle}
      />
      <SocialLoginButton
        title="Continuar com Apple"
        icon={loading => (loading ? <ActivityIndicator size="small" color={BrandColors.appleText} /> : <FontAwesome name="apple" size={20} color={BrandColors.appleText} />)}
        backgroundColor={BrandColors.appleBg}
        textColor={BrandColors.appleText}
        loading={appleLoading}
        onPress={onApple}
      />
    </View>
  );
}

interface SocialLoginButtonProps {
  title: string;
  /** Ícone (ou spinner, durante o loading) renderizado à esquerda. */
  icon: (loading: boolean) => ReactNode;
  backgroundColor: string;
  textColor: string;
  loading: boolean;
  onPress: () => void;
}

function SocialLoginButton({ title, icon, backgroundColor, textColor, loading, onPress }: SocialLoginButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, loading && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      disabled={loading}
    >
      {icon(loading)}
      <Text style={[styles.text, { color: textColor }]}>{loading ? 'Conectando…' : title}</Text>
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
    width: '100%',
    minHeight: 50,
    borderRadius: Radius.chip,
    marginVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three - 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  text: {
    fontSize: Type.cardTitle,
    fontWeight: '600',
  },
});
