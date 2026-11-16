/** Paleta dedicada da tela de login (espelho do mobile). */
export const LoginColors = {
  backgroundTop: '#0D0D0D',
  backgroundBottom: '#121212',
  input: '#1A1A1A',
  inputBorder: '#2A2A2A',
  inputBorderFocused: '#F1A80A',
  text: '#FFFFFF',
  muted: '#9CA3AF',
  link: '#F1A80A',
  divider: '#262626',
  dividerText: '#888888',
  googleBorder: '#333333',
  googleBackground: '#141414',
  googleIcon: '#4285F4',
  primaryText: '#000000',
  error: '#EF4444',
  arc: 'rgba(241, 168, 10, 0.25)',
} as const;

/** Gradientes da tela de login. */
export const LoginGradients = {
  background: [LoginColors.backgroundTop, LoginColors.backgroundBottom],
  button: ['#F5B014', '#D48800'],
  waveTop: ['rgba(241, 168, 10, 0.22)', 'rgba(241, 168, 10, 0)'],
  waveBottom: ['rgba(229, 148, 0, 0)', 'rgba(241, 168, 10, 0.16)'],
} as const;

/** Mínimo coerente com a configuração do Clerk Dashboard (senha). */
export const PASSWORD_MIN = 8;
