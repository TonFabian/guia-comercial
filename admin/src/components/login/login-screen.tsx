import { useSignIn } from '@clerk/clerk-react';
import { useState } from 'react';

import logoCastelo from '../../assets/logo-castelo.png';

import { clerkErrorToMessage, GenericAuthErrorMessage } from './clerk-errors';
import { LoginField } from './login-field';
import { LoginColors, LoginGradients, PASSWORD_MIN } from './login-theme';
import { SocialButtons } from './social-buttons';

type Mode = 'login' | 'reset-email' | 'reset-code' | 'reset-password';

export function LoginScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  if (!isLoaded || !signIn || !setActive) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center" style={{ background: LoginGradients.background.join(', ') }}>
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#F1A80A]/25 border-t-[#F1A80A]" />
      </div>
    );
  }

  async function handleLogin() {
    if (!email.trim()) {
      setError('Preencha o e-mail');
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(`A senha deve ter no mínimo ${PASSWORD_MIN} caracteres`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signIn!.create({ identifier: email.trim(), password });
      if (signIn!.status !== 'complete' || !signIn!.createdSessionId) {
        setError(GenericAuthErrorMessage);
        return;
      }
      await setActive!({ session: signIn!.createdSessionId });
    } catch (authError) {
      setError(clerkErrorToMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(strategy: 'oauth_google' | 'oauth_apple', setFlag: (v: boolean) => void) {
    setFlag(true);
    setError(null);
    try {
      await signIn!.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (authError) {
      setError(clerkErrorToMessage(authError));
      setFlag(false);
    }
  }

  async function startReset() {
    if (!email.trim()) {
      setError('Preencha o e-mail');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn!.create({ identifier: email.trim() });
      const emailFactor = signIn!.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'reset_password_email_code',
      ) as { strategy: 'reset_password_email_code'; emailAddressId: string } | undefined;
      if (!emailFactor) {
        setError(GenericAuthErrorMessage);
        return;
      }
      await signIn!.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId: emailFactor.emailAddressId,
      });
      setMode('reset-code');
    } catch (authError) {
      setError(clerkErrorToMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setLoading(true);
    setError(null);
    try {
      const emailFactor = signIn!.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'reset_password_email_code',
      ) as { strategy: 'reset_password_email_code'; emailAddressId: string } | undefined;
      if (!emailFactor) {
        setError(GenericAuthErrorMessage);
        return;
      }
      await signIn!.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId: emailFactor.emailAddressId,
      });
    } catch (authError) {
      setError(clerkErrorToMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (code.trim().length < 4) {
      setError('Digite o código recebido por e-mail');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn!.attemptFirstFactor({ strategy: 'reset_password_email_code', code: code.trim() });
      if (signIn!.status !== 'needs_new_password') {
        setError(GenericAuthErrorMessage);
        return;
      }
      setMode('reset-password');
    } catch (authError) {
      setError(clerkErrorToMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  async function finishReset() {
    if (newPassword.length < PASSWORD_MIN) {
      setError(`A senha deve ter no mínimo ${PASSWORD_MIN} caracteres`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn!.resetPassword({ password: newPassword });
      if (signIn!.status !== 'complete' || !signIn!.createdSessionId) {
        setError(GenericAuthErrorMessage);
        return;
      }
      await setActive!({ session: signIn!.createdSessionId });
    } catch (authError) {
      setError(clerkErrorToMessage(authError));
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    setMode('login');
    setError(null);
    setCode('');
    setNewPassword('');
  }

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${LoginGradients.background[0]} 0%, ${LoginGradients.background[1]} 100%)` }}
    >
      {/* ondas decorativas */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute -left-[140px] -top-[160px] h-[340px] w-[340px] rounded-full"
          style={{ background: `radial-gradient(circle, ${LoginGradients.waveTop[0]} 0%, ${LoginGradients.waveTop[1]} 70%)` }}
        />
        <div
          className="absolute -bottom-[190px] -right-[150px] h-[380px] w-[380px] rounded-full"
          style={{ background: `radial-gradient(circle, ${LoginGradients.waveBottom[1]} 0%, ${LoginGradients.waveBottom[0]} 70%)` }}
        />
        <div
          className="absolute bottom-12 -right-[60px] h-[120px] w-[220px] rounded-[110px] border-t-2"
          style={{ borderColor: LoginColors.arc }}
        />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-[400px] flex-col items-center gap-6">
          {/* cabeçalho */}
          <header className="flex flex-col items-center">
            <img src={logoCastelo} alt="Castelo Tem" className="h-[180px] w-[200px] object-contain" />
            <p className="mt-2 text-center text-base font-medium" style={{ color: LoginColors.text }}>
              Sua cidade, ainda mais perto de você!
            </p>
            <div className="mt-2 h-[18px] w-[140px] rounded-b-full border-b-2 opacity-85" style={{ borderColor: LoginColors.link }} />
            <span
              className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: 'rgba(241,168,10,0.3)', backgroundColor: 'rgba(241,168,10,0.1)', color: LoginColors.link }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Painel Administrativo
            </span>
          </header>

          {error ? <p className="text-center text-sm" style={{ color: LoginColors.error }}>{error}</p> : null}

          {/* formulário conforme o modo */}
          {mode === 'login' ? (
            <>
              <form
                className="flex w-full flex-col gap-2.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleLogin();
                }}
              >
                <LoginField
                  icon="user"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="E-mail ou telefone"
                  autoComplete="username"
                  disabled={loading}
                />
                <LoginField
                  icon="lock"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Senha"
                  autoComplete="current-password"
                  disabled={loading}
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="shrink-0"
                      style={{ color: LoginColors.muted }}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  }
                />
                <div className="flex items-center justify-between px-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: LoginColors.text }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-[18px] w-[18px] rounded border"
                      style={{ borderColor: LoginColors.muted, accentColor: LoginColors.link }}
                    />
                    Lembrar-me
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('reset-email');
                    }}
                    className="text-sm font-semibold"
                    style={{ color: LoginColors.link }}
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <SubmitButton label="Entrar" loading={loading} showArrow />
              </form>

              <div className="flex w-full items-center gap-3">
                <div className="h-px flex-1" style={{ backgroundColor: LoginColors.divider }} />
                <span className="text-sm" style={{ color: LoginColors.dividerText }}>
                  ou entre com
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: LoginColors.divider }} />
              </div>

              <div className="w-full">
                <SocialButtons
                  onGoogle={() => void handleSocial('oauth_google', setGoogleLoading)}
                  onApple={() => void handleSocial('oauth_apple', setAppleLoading)}
                  googleLoading={googleLoading}
                  appleLoading={appleLoading}
                />
              </div>
            </>
          ) : null}

          {mode === 'reset-email' ? (
            <form
              className="flex w-full flex-col gap-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                void startReset();
              }}
            >
              <p className="text-center text-sm" style={{ color: LoginColors.muted }}>
                Informe seu e-mail para receber o código de redefinição.
              </p>
              <LoginField
                icon="mail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-mail"
                autoComplete="email"
                disabled={loading}
              />
              <SubmitButton label="Enviar código" loading={loading} />
              <button
                type="button"
                onClick={backToLogin}
                className="self-center text-sm underline"
                style={{ color: LoginColors.muted }}
              >
                Voltar
              </button>
            </form>
          ) : null}

          {mode === 'reset-code' ? (
            <form
              className="flex w-full flex-col gap-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                void verifyCode();
              }}
            >
              <p className="text-center text-sm" style={{ color: LoginColors.muted }}>
                Digite o código de 6 dígitos enviado para {email}.
              </p>
              <LoginField
                icon="hash"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                maxLength={6}
                disabled={loading}
              />
              <SubmitButton label="Confirmar código" loading={loading} />
              <div className="flex items-center justify-between px-3">
                <button
                  type="button"
                  onClick={() => void resendCode()}
                  className="text-sm font-semibold"
                  style={{ color: LoginColors.link }}
                  disabled={loading}
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={backToLogin}
                  className="text-sm underline"
                  style={{ color: LoginColors.muted }}
                >
                  Voltar
                </button>
              </div>
            </form>
          ) : null}

          {mode === 'reset-password' ? (
            <form
              className="flex w-full flex-col gap-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                void finishReset();
              }}
            >
              <p className="text-center text-sm" style={{ color: LoginColors.muted }}>
                Defina sua nova senha.
              </p>
              <LoginField
                icon="lock"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={`Senha (mínimo ${PASSWORD_MIN} caracteres)`}
                autoComplete="new-password"
                disabled={loading}
                right={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="shrink-0"
                    style={{ color: LoginColors.muted }}
                    aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showNewPassword ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                }
              />
              <SubmitButton label="Redefinir senha" loading={loading} />
              <button
                type="button"
                onClick={backToLogin}
                className="self-center text-sm underline"
                style={{ color: LoginColors.muted }}
              >
                Voltar
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface SubmitButtonProps {
  label: string;
  loading: boolean;
  showArrow?: boolean;
}

function SubmitButton({ label, loading, showArrow = false }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 flex h-[54px] w-full items-center justify-center gap-2 rounded-[27px] px-8 text-base font-bold transition-opacity disabled:opacity-70"
      style={{
        background: `linear-gradient(90deg, ${LoginGradients.button[0]} 0%, ${LoginGradients.button[1]} 100%)`,
        color: LoginColors.primaryText,
        fontFamily: 'var(--font-family-heading)',
      }}
    >
      {loading ? (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        <>
          {label}
          {showArrow ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          ) : null}
        </>
      )}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
