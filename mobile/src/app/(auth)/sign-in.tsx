import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AuthSession from 'expo-auth-session';
import { maybeCompleteAuthSession } from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useClerk, useSSO } from '@clerk/expo';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import { clerkErrorToMessage } from '@/features/auth/clerk-errors';
import { useWarmUpBrowser } from '@/features/auth/use-warm-up-browser';
import { SocialButtons } from '@/features/auth/sign-in/social-buttons';
import { EmailPasswordForm } from '@/features/auth/sign-in/email-password-form';
import { ForgotOrGuest } from '@/features/auth/sign-in/forgot-or-guest';

// Fecha a sessão do browser que abrir durante o fluxo SSO: precisa rodar no
// topo do módulo, fora do componente, antes do primeiro render.
maybeCompleteAuthSession();

/**
 * Tela de login do mock ("Acesse sua conta"): sociais (Google sempre, Apple
 * só iOS) + e-mail/senha + convidado. O fluxo em uso é o SSO web do Clerk
 * (expo-web-browser): funciona no Expo Go e no dev build.
 */
export default function SignInScreen() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const clerk = useClerk();
  const router = useRouter();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function viewFor(strategy: 'oauth_google' | 'oauth_apple', withLoading: (value: boolean) => void) {
    return async () => {
      withLoading(true);
      setError(null);

      try {
        const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'guiacomercial' });
        const { createdSessionId, setActive } = await startSSOFlow({ strategy, redirectUrl });

        // Sem sessão criada: o fluxo ficou pendente (transfer/tarefas) — a
        // tela continue coleta o que falta, como indicam os docs do Clerk.
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });

          // A spec exige conferir a tarefa pendente da sessão antes de
          // entrar nas abas: MFA/organização/redesenha-routes ficariam
          // incompletos em "(tabs)" sem isso.
          const pendencia = clerk.session?.currentTask?.key;
          router.replace(pendencia ? '/(auth)/continue' : '/(tabs)');
          return;
        }

        router.push('/(auth)/continue');
      } catch (authError) {
        setError(clerkErrorToMessage(authError));
      } finally {
        withLoading(false);
      }
    };
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Acesse sua conta</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <SocialButtons
            onGoogle={viewFor('oauth_google', setGoogleLoading)}
            onApple={viewFor('oauth_apple', setAppleLoading)}
            googleLoading={googleLoading}
            appleLoading={appleLoading}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <EmailPasswordForm />

          <ForgotOrGuest />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GuiaColors.background,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  logo: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    borderRadius: Radius.iconBox,
  },
  title: {
    alignSelf: 'center',
    color: GuiaColors.text,
    fontSize: Type.headline,
    fontWeight: '700',
  },
  error: {
    color: GuiaColors.error,
    fontSize: Type.small,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: GuiaColors.border,
  },
  dividerText: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
  },
});
