import { useState } from 'react';
import { router } from 'expo-router';
import { useClerk, useSignIn, useSignUp } from '@clerk/expo';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import { clerkErrorToMessage, GenericAuthErrorMessage } from '@/features/auth/clerk-errors';

/** Mínimo coerente com a configuração do Clerk Dashboard (senha). */
export const PASSWORD_MIN = 8;

type Mode = 'entrar' | 'criar';

/**
 * Formulário e-mail/senha com alternância entrar/criar (custom flows).
 *
 * Cadastro usa verificação de e-mail por código de 6 dígitos inline, com
 * reenvio. O telefone informado é aplicado pós-sessão com
 * `user.createPhoneNumber`: na própria criação o Clerk exigiria verificação
 * por SMS também, duplicando o fluxo (número fica sem verificação).
 */
export function EmailPasswordForm() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const clerk = useClerk();

  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [awaitVerification, setAwaitVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function switchMode() {
    setMode(mode === 'entrar' ? 'criar' : 'entrar');
    setError(null);
    setAwaitVerification(false);
    setCode('');
  }

  if (awaitVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.helper}>Digite o código de 6 dígitos enviado para {email}</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          placeholder="000000"
          placeholderTextColor={GuiaColors.textSecondary}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
        />
        <ErrorText error={error} />
        <PrimaryButton label="Confirmar código" onPress={submit} loading={loading} />
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
    <View style={styles.container}>
      <ModeToggle mode={mode} onChange={switchMode} />

      {mode === 'criar' ? (
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.input, styles.nameField]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Nome"
            placeholderTextColor={GuiaColors.textSecondary}
            textContentType="givenName"
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, styles.nameField]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Sobrenome"
            placeholderTextColor={GuiaColors.textSecondary}
            textContentType="familyName"
            autoCapitalize="words"
          />
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        placeholderTextColor={GuiaColors.textSecondary}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />

      {mode === 'criar' ? (
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Telefone (opcional)"
          placeholderTextColor={GuiaColors.textSecondary}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      ) : null}

      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder={`Senha (mínimo ${PASSWORD_MIN} caracteres)`}
        placeholderTextColor={GuiaColors.textSecondary}
        secureTextEntry
        autoComplete={mode === 'entrar' ? 'password' : 'new-password'}
        textContentType={mode === 'entrar' ? 'password' : 'newPassword'}
      />

      <ErrorText error={error} />

      <PrimaryButton
        label={mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        onPress={submit}
        loading={loading}
      />
    </View>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: () => void }) {
  return (
    <TouchableOpacity style={styles.modeToggle} onPress={onChange} role="button" accessibilityLabel="Alternar entre entrar e criar conta">
      <Text style={styles.modeToggleText}>
        {mode === 'entrar' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
      </Text>
    </TouchableOpacity>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return <Text style={styles.error}>{error}</Text>;
}

function PrimaryButton({ label, onPress, loading }: { label: string; onPress: () => void; loading: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.primary, loading && styles.disabled]}
      onPress={onPress}
      disabled={loading}
      role="button"
      accessibilityLabel={loading ? 'Aguarde' : label}
      accessibilityState={{ busy: loading }}
    >
      {loading ? <ActivityIndicator size="small" color={GuiaColors.background} /> : null}
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  modeToggle: {
    alignSelf: 'flex-end',
  },
  modeToggleText: {
    color: GuiaColors.primary,
    fontSize: Type.small,
  },
  helper: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
    textAlign: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  nameField: {
    flex: 1,
  },
  input: {
    backgroundColor: GuiaColors.surface,
    borderColor: GuiaColors.border,
    borderWidth: 1,
    borderRadius: Radius.chip,
    color: GuiaColors.text,
    fontSize: Type.base,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three,
  },
  error: {
    color: GuiaColors.error,
    fontSize: Type.small,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.three + 2,
  },
  disabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: GuiaColors.background,
    fontSize: Type.subtitle,
    fontWeight: '700',
  },
  link: {
    alignSelf: 'center',
  },
  linkText: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
  },
});
