import Feather from '@expo/vector-icons/Feather';
import { useClerk, useSignIn, useSSO } from '@clerk/expo';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily, FontWeight, LoginColors, LoginGradients, Typography } from '@/constants/theme';
import { clerkErrorToMessage, GenericAuthErrorMessage } from '@/features/auth/clerk-errors';
import { EmailPasswordForm, SubmitButton } from '@/features/auth/sign-in/email-password-form';
import { ForgotOrGuest } from '@/features/auth/sign-in/forgot-or-guest';
import { LoginField } from '@/features/auth/sign-in/login-field';
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
  const { signIn } = useSignIn();
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

  const [resetMode, setResetMode] = useState<'none' | 'email' | 'code' | 'password'>('none');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

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

  async function startReset() {
    if (!resetEmail.trim()) {
      setResetError('Preencha o e-mail');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      await signIn.create({ identifier: resetEmail.trim() });
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setResetError(clerkErrorToMessage(sendError));
        return;
      }
      setResetMode('code');
    } catch (authError) {
      setResetError(clerkErrorToMessage(authError));
    } finally {
      setResetLoading(false);
    }
  }

  async function resendResetCode() {
    setResetLoading(true);
    setResetError(null);
    try {
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setResetError(clerkErrorToMessage(sendError));
      }
    } catch (authError) {
      setResetError(clerkErrorToMessage(authError));
    } finally {
      setResetLoading(false);
    }
  }

  async function verifyResetCode() {
    if (resetCode.trim().length < 4) {
      setResetError('Digite o código recebido por e-mail');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: resetCode.trim() });
      if (verifyError) {
        setResetError(clerkErrorToMessage(verifyError));
        return;
      }
      if (signIn.status !== 'needs_new_password') {
        setResetError(GenericAuthErrorMessage);
        return;
      }
      setResetMode('password');
    } catch (authError) {
      setResetError(clerkErrorToMessage(authError));
    } finally {
      setResetLoading(false);
    }
  }

  async function finishReset() {
    if (resetNewPassword.length < 8) {
      setResetError('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({ password: resetNewPassword });
      if (submitError) {
        setResetError(clerkErrorToMessage(submitError));
        return;
      }
      if (signIn.status !== 'complete' || !signIn.createdSessionId) {
        setResetError(GenericAuthErrorMessage);
        return;
      }
      await signIn.finalize();
      const pendencia = clerk.session?.currentTask?.key;
      router.replace(pendencia ? '/(auth)/continue' : '/(tabs)');
    } catch (authError) {
      setResetError(clerkErrorToMessage(authError));
    } finally {
      setResetLoading(false);
    }
  }

  function backToLogin() {
    setResetMode('none');
    setResetError(null);
    setResetCode('');
    setResetNewPassword('');
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

            {resetMode === 'none' ? (
              <>
                {error ? <Text style={styles.error}>{error}</Text> : null}

                <EmailPasswordForm mode={mode} onForgot={() => setResetMode('email')} />

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
              </>
            ) : (
              <>
                {resetError ? <Text style={styles.error}>{resetError}</Text> : null}

                {resetMode === 'email' ? (
                  <View style={styles.resetContainer}>
                    <Text style={styles.helper}>Informe seu e-mail para receber o código de redefinição.</Text>
                    <LoginField
                      icon="mail"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      placeholder="E-mail"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                    />
                    <SubmitButton
                      label="Enviar código"
                      onPress={startReset}
                      loading={resetLoading}
                    />
                    <TouchableOpacity style={styles.backLink} onPress={backToLogin} accessibilityRole="button">
                      <Text style={styles.backText}>Voltar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {resetMode === 'code' ? (
                  <View style={styles.resetContainer}>
                    <Text style={styles.helper}>Digite o código de 6 dígitos enviado para {resetEmail}.</Text>
                    <LoginField
                      icon="hash"
                      value={resetCode}
                      onChangeText={(value) => setResetCode(value.replace(/\D/g, ''))}
                      placeholder="000000"
                      keyboardType="number-pad"
                      maxLength={6}
                      textContentType="oneTimeCode"
                    />
                    <SubmitButton
                      label="Confirmar código"
                      onPress={verifyResetCode}
                      loading={resetLoading}
                    />
                    <View style={styles.resetActions}>
                      <TouchableOpacity onPress={() => void resendResetCode()} disabled={resetLoading} accessibilityRole="button">
                        <Text style={styles.linkText}>Reenviar código</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={backToLogin} accessibilityRole="button">
                        <Text style={styles.backText}>Voltar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {resetMode === 'password' ? (
                  <View style={styles.resetContainer}>
                    <Text style={styles.helper}>Defina sua nova senha.</Text>
                    <LoginField
                      icon="lock"
                      value={resetNewPassword}
                      onChangeText={setResetNewPassword}
                      placeholder="Nova senha (mínimo 8 caracteres)"
                      secureTextEntry={!showResetPassword}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      right={
                        <TouchableOpacity
                          onPress={() => setShowResetPassword((v) => !v)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={showResetPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          <Feather name={showResetPassword ? 'eye' : 'eye-off'} size={20} color={LoginColors.muted} />
                        </TouchableOpacity>
                      }
                    />
                    <SubmitButton
                      label="Redefinir senha"
                      onPress={finishReset}
                      loading={resetLoading}
                      showArrow
                    />
                    <TouchableOpacity style={styles.backLink} onPress={backToLogin} accessibilityRole="button">
                      <Text style={styles.backText}>Voltar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            )}
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
    resetContainer: {
      width: '100%',
      gap: 10,
    },
    helper: {
      color: LoginColors.muted,
      ...Typography.body,
      textAlign: 'center',
    },
    resetActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
    },
    backLink: {
      alignSelf: 'center',
    },
    backText: {
      color: LoginColors.muted,
      ...Typography.body,
      textDecorationLine: 'underline',
    },
    linkText: {
      color: LoginColors.link,
      ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
  });
}

const styles = makeStyles();
