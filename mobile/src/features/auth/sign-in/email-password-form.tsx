import { useClerk, useSignIn, useSignUp } from '@clerk/expo';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { LoginColors, LoginGradients, Type } from '@/constants/theme';
import { clerkErrorToMessage, GenericAuthErrorMessage } from '@/features/auth/clerk-errors';

import { LoginField } from './login-field';
import type { AuthMode } from './login-labels';
import { loginSubmitLabel } from './login-labels';
import { RememberRow } from './remember-row';

/** Mínimo coerente com a configuração do Clerk Dashboard (senha). */
export const PASSWORD_MIN = 8;

/**
 * Formulário e-mail/senha com alternância entrar/criar (custom flows).
 *
 * O modo é controlado pela tela (rodapé "Cadastre-se"/"Entrar"). O cadastro
 * usa verificação de e-mail por código de 6 dígitos inline, com reenvio. O
 * telefone informado é aplicado pós-sessão com `user.createPhoneNumber`: na
 * própria criação o Clerk exigiria verificação por SMS também, duplicando o
 * fluxo (número fica sem verificação).
 */
const FormWrapper = Platform.OS === 'web' ? ('form' as any) : View;

export function EmailPasswordForm({ mode }: { mode: AuthMode }) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const clerk = useClerk();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [awaitVerification, setAwaitVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ao trocar de modo, descarta só o estado transitório do fluxo anterior
  // (erro/verificação), preservando e-mail e senha já digitados.
  const [previousMode, setPreviousMode] = useState<AuthMode>(mode);
  if (previousMode !== mode) {
    setPreviousMode(mode);
    setError(null);
    setAwaitVerification(false);
    setCode('');
  }

  const loaded = Boolean(signIn) && Boolean(signUp);

  async function submit() {
    if (!loaded || !signIn || !signUp) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (awaitVerification) {
        await confirmCode();
        return;
      }

      if (mode === 'entrar') {
        await signInWithPassword();
      } else {
        await createAccount();
      }
    } catch (submitError) {
      setError(clerkErrorToMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  /** Entrar: estratégia `password` na primeira tentativa. */
  async function signInWithPassword() {
    if (!signIn) {
      return;
    }

    const { error: passwordError } = await signIn.password({
      identifier: email.trim(),
      password,
    });

    // Erros são destruturados na API future (não lançados): reportar direto.
    if (passwordError) {
      setError(clerkErrorToMessage(passwordError));
      return;
    }

    if (signIn.status !== 'complete' || !signIn.createdSessionId) {
      setError(GenericAuthErrorMessage);
      return;
    }

    await signIn.finalize();

    if (pendenciaDeSessao()) {
      router.replace('/(auth)/continue');
      return;
    }

    router.replace('/(tabs)');
  }

  /** Criar conta: passo 1 (dados + senha) e passo 2 (código por e-mail). */
  async function createAccount() {
    if (!signUp) {
      return;
    }

    const { error: createError } = await signUp.password({
      emailAddress: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    if (createError) {
      setError(clerkErrorToMessage(createError));
      return;
    }

    const emailNeedsVerification = signUp.unverifiedFields.includes('email_address');

    if (signUp.status !== 'complete' && emailNeedsVerification) {
      const { error: sendError } = await signUp.verifications.sendEmailCode();

      if (sendError) {
        setError(clerkErrorToMessage(sendError));
        return;
      }

      setAwaitVerification(true);
      return;
    }

    if (signUp.status === 'complete' && signUp.createdSessionId) {
      await signUp.finalize();

      if (pendenciaDeSessao()) {
        router.replace('/(auth)/continue');
        return;
      }

      // O recurso de usuário só existe após a sessão ativa: aplicamos o
      // telefone DEPOIS do finalize, pela instância do Clerk.
      await applyPhoneAfterSession();
      router.replace('/(tabs)');
      return;
    }

    setError(GenericAuthErrorMessage);
  }

  /** Passo 2 do cadastro: confirmar o código de 6 dígitos do e-mail. */
  async function confirmCode() {
    if (!signUp) {
      return;
    }

    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });

    if (verifyError) {
      setError(clerkErrorToMessage(verifyError));
      return;
    }

    if (signUp.status !== 'complete' || !signUp.createdSessionId) {
      setError(GenericAuthErrorMessage);
      return;
    }

    await signUp.finalize();

    if (pendenciaDeSessao()) {
      router.replace('/(auth)/continue');
      return;
    }

    await applyPhoneAfterSession();
    router.replace('/(tabs)');
  }

  /** True quando a sessão ativa exige uma tarefa antes de navegar. */
  function pendenciaDeSessao(): boolean {
    return Boolean(clerk.session?.currentTask?.key);
  }

  async function resendCode() {
    if (!loaded || !signUp) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: sendError } = await signUp.verifications.sendEmailCode();

      if (sendError) {
        setError(clerkErrorToMessage(sendError));
      }
    } catch (resendError) {
      setError(clerkErrorToMessage(resendError));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Telefone aplicado à instância do Clerk após a sessão ativa (número fica
   * no perfil sem verificação, conforme decisão da spec). A instância expõe
   * o recurso de usuário ao vivo — o snapshot de `useUser()` antes do
   * `finalize()` é `null` e silenciaria o telefone.
   */
  async function applyPhoneAfterSession() {
    const trimmed = phone.trim();

    if (!trimmed || !clerk.user) {
      return;
    }

    try {
      await clerk.user.createPhoneNumber({ phoneNumber: trimmed });
    } catch {
      // Telefone é opcional: falhar aqui não pode impedir o login.
    }
  }

  if (awaitVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.helper}>Digite o código de 6 dígitos enviado para {email}</Text>
        <LoginField
          icon="hash"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
        />
        <ErrorText error={error} />
        <SubmitButton label="Confirmar código" onPress={submit} loading={loading} />
        <TouchableOpacity
          style={styles.link}
          onPress={resendCode}
          role="button"
          accessibilityLabel="Reenviar código de verificação"
        >
          <Text style={styles.linkText}>Reenviar código</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FormWrapper
      style={styles.container}
      onSubmit={(e: any) => {
        e?.preventDefault?.();
        void submit();
      }}
    >
      {mode === 'criar' ? (
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <LoginField
              icon="user"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Nome"
              autoCapitalize="words"
              textContentType="givenName"
            />
          </View>
          <View style={styles.nameField}>
            <LoginField
              icon="user"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Sobrenome"
              autoCapitalize="words"
              textContentType="familyName"
            />
          </View>
        </View>
      ) : null}

      <LoginField
        icon={mode === 'entrar' ? 'user' : 'mail'}
        value={email}
        onChangeText={setEmail}
        placeholder={mode === 'entrar' ? 'E-mail ou telefone' : 'E-mail'}
        keyboardType={mode === 'entrar' ? 'default' : 'email-address'}
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
      />

      {mode === 'criar' ? (
        <LoginField
          icon="phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="Telefone (opcional)"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      ) : null}

      <LoginField
        icon="lock"
        value={password}
        onChangeText={setPassword}
        placeholder={mode === 'entrar' ? 'Senha' : `Senha (mínimo ${PASSWORD_MIN} caracteres)`}
        secureTextEntry={!showPassword}
        autoComplete={mode === 'entrar' ? 'password' : 'new-password'}
        textContentType={mode === 'entrar' ? 'password' : 'newPassword'}
        right={
          <TouchableOpacity
            onPress={() => setShowPassword((visible) => !visible)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Feather
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color={LoginColors.muted}
            />
          </TouchableOpacity>
        }
      />

      {mode === 'entrar' ? (
        <RememberRow
          remember={remember}
          onToggleRemember={() => setRemember((checked) => !checked)}
        />
      ) : null}

      <ErrorText error={error} />

      <SubmitButton
        label={loginSubmitLabel(mode)}
        onPress={submit}
        loading={loading}
        showArrow={mode === 'entrar'}
      />
    </FormWrapper>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return <Text style={styles.error}>{error}</Text>;
}

function SubmitButton({
  label,
  onPress,
  loading,
  showArrow = false,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
  showArrow?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.submitWrap}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      role="button"
      accessibilityLabel={loading ? 'Aguarde' : label}
      accessibilityState={{ busy: loading }}
    >
      <LinearGradient
        colors={LoginGradients.button}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.submitGradient}
      >
        {loading ? (
          <ActivityIndicator size="small" color={LoginColors.primaryText} />
        ) : (
          <>
            <Text style={styles.submitText}>{label}</Text>
            {showArrow ? (
              <Feather
                name="arrow-right"
                size={22}
                color={LoginColors.primaryText}
                style={styles.submitArrow}
              />
            ) : null}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nameField: {
    flex: 1,
  },
  helper: {
    color: LoginColors.muted,
    fontSize: Type.body,
    textAlign: 'center',
  },
  error: {
    color: LoginColors.error,
    fontSize: Type.small,
  },
  submitWrap: {
    marginTop: 8,
  },
  submitGradient: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: LoginColors.primaryText,
    fontSize: Type.title,
    fontWeight: '700',
  },
  submitArrow: {
    marginLeft: 8,
  },
  link: {
    alignSelf: 'center',
  },
  linkText: {
    color: LoginColors.muted,
    fontSize: Type.small,
  },
});
