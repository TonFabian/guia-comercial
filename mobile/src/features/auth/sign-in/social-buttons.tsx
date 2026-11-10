import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ReactNode } from 'react';

import { LoginColors, Typography } from '@/constants/theme';

interface SocialButtonsProps {
  onGoogle: () => void;
  onApple: () => void;
  /** Estado separado: os fluxos sociais podem demorar diferente. */
  googleLoading: boolean;
  appleLoading: boolean;
}

/**
 * Botões sociais no padrão da tela de login: pílula outline escura com o
 * ícone alinhado à esquerda e o texto centralizado. Google em todas as
 * plataformas; Apple só no iOS.
 */
export function SocialButtons({ onGoogle, onApple, googleLoading, appleLoading }: SocialButtonsProps) {
  return (
    <View style={styles.column}>
      <SocialLoginButton
        title="Entrar com Google"
        icon={(loading) =>
          loading ? (
            <ActivityIndicator size="small" color={LoginColors.googleIcon} />
          ) : (
            <FontAwesome name="google" size={20} color={LoginColors.googleIcon} />
          )
        }
        loading={googleLoading}
        onPress={onGoogle}
      />

      {Platform.OS === 'ios' ? (
        <SocialLoginButton
          title="Entrar com Apple"
          icon={(loading) =>
            loading ? (
              <ActivityIndicator size="small" color={LoginColors.text} />
            ) : (
              <FontAwesome name="apple" size={20} color={LoginColors.text} />
            )
          }
          loading={appleLoading}
          onPress={onApple}
        />
      ) : null}
    </View>
  );
}

interface SocialLoginButtonProps {
  title: string;
  /** Ícone (ou spinner, durante o loading) renderizado à esquerda. */
  icon: (loading: boolean) => ReactNode;
  loading: boolean;
  onPress: () => void;
}

function SocialLoginButton({ title, icon, loading, onPress }: SocialLoginButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      disabled={loading}
    >
      <View style={styles.iconSlot}>{icon(loading)}</View>
      <Text style={styles.text}>{loading ? 'Conectando…' : title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: LoginColors.googleBorder,
    backgroundColor: LoginColors.googleBackground,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  iconSlot: {
    position: 'absolute',
    left: 20,
  },
  text: {
    color: LoginColors.text,
        ...Typography.h5,
  },
});
