import { useClerk, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { maybeCompleteAuthSession } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginColors, LoginGradients, Typography } from '@/constants/theme';
import { clerkErrorToMessage } from '@/features/auth/clerk-errors';
import { EmailPasswordForm } from '@/features/auth/sign-in/email-password-form';
import { ForgotOrGuest } from '@/features/auth/sign-in/forgot-or-guest';
import { LoginBackground } from '@/features/auth/sign-in/login-background';
import { LoginFooter } from '@/features/auth/sign-in/login-footer';
import { LoginHeader } from '@/features/auth/sign-in/login-header';
import type { AuthMode } from '@/features/auth/sign-in/login-labels';
import { SocialButtons } from '@/features/auth/sign-in/social-buttons';
import { useWarmUpBrowser } from '@/features/auth/use-warm-up-browser';
import { useAuthState } from '@/providers/auth-provider';

// Fecha a sessão do browser que abrir durante o fluxo SSO: precisa rodar no
// topo do módulo, fora do componente, antes do primeiro render.
maybeCompleteAuthSession();

/**
 * Tela de login ("Castelo Tem"): fundo escuro com ondas douradas, logo,
 * formulário e-mail/telefone + senha, ações sociais e rodapé de cadastro.
 * O fluxo em uso é o SSO web do Clerk (expo-web-browser): funciona no Expo Go
 * e no dev build.
 */
export default function SignInScreen() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const clerk = useClerk();
  const router = useRouter();
  const { state } = useAuthState();

  const [mode, setMode] = useState<AuthMode>('entrar');

  // Guarda de entrada: se já existe sessão ativa (ex.: app reiniciado com
  // sessão persistida), não exibe a tela de login — redireciona para as abas.
  // Convidado ainda pode acessar o login para autenticar.
  useEffect(() => {
    if (state === 'signedIn') {
      router.replace('/(tabs)');
    }
  }, [state, router]);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function viewFor(
    strategy: 'oauth_google' | 'oauth_apple',
    withLoading: (value: boolean) => void,
  ) {
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

  function toggleMode() {
    setMode((current) => (current === 'entrar' ? 'criar' : 'entrar'));
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={LoginGradients.background}
        style={StyleSheet.absoluteFill}
      />
      <LoginBackground />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LoginHeader />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <EmailPasswordForm mode={mode} />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou entre com</Text>
              <View style={styles.dividerLine} />
            </View>

            <SocialButtons
              onGoogle={viewFor('oauth_google', setGoogleLoading)}
              onApple={viewFor('oauth_apple', setAppleLoading)}
              googleLoading={googleLoading}
              appleLoading={appleLoading}
            />

            <LoginFooter mode={mode} onSwitchMode={toggleMode} />

            <ForgotOrGuest />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: LoginColors.backgroundTop,
    },
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 40,
      gap: 24,
    },
    error: {
      color: LoginColors.error,
      ...Typography.caption,
      textAlign: 'center',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: LoginColors.divider,
    },
    dividerText: {
      color: LoginColors.dividerText,
      paddingHorizontal: 12,
      ...Typography.body,
    },
  });
}

const styles = makeStyles();
