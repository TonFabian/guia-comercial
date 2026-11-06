import '@/global.css';

import type { Theme } from 'expo-router';
import { Dimensions } from 'react-native';
import { fluidWidthFactor } from '@/theme/fluid-width';

const _expoRouterRequire = (
  globalThis as { require?: (id: string) => unknown }
).require;

const _fallbackFonts = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  bold: { fontFamily: 'System', fontWeight: '600' as const },
  heavy: { fontFamily: 'System', fontWeight: '700' as const },
};

let _resolvedDarkTheme: Theme = {
  dark: true,
  colors: {
    primary: 'rgb(10, 132, 255)',
    background: 'rgb(1, 1, 1)',
    card: 'rgb(18, 18, 18)',
    text: 'rgb(229, 229, 231)',
    border: 'rgb(39, 39, 41)',
    notification: 'rgb(255, 69, 58)',
  },
  fonts: _fallbackFonts,
};

try {
  const _mod = _expoRouterRequire?.('expo-router') as
    | { DarkTheme?: Theme }
    | undefined;
  if (_mod?.DarkTheme) {
    _resolvedDarkTheme = _mod.DarkTheme;
  }
} catch {
  // Ambiente de teste (vitest/node): expo-router não carrega (Flow).
  // Mantém o fallback acima; em produção (Metro) o require tem sucesso.
}

const DarkTheme: Theme = _resolvedDarkTheme;

export const GuiaColors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#242424',
  primary: '#FFC107',
  primaryDim: '#B8860B',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textSoft: '#D1D5DB',
  border: '#2E2E2E',
  borderSoft: '#222222',
  success: '#22C55E',
  error: '#EF4444',
  whatsapp: '#25D366',
  coverPlaceholder: '#3A3A3A',
} as const;

/** Cores de destaque dos cards (banners, cupons) sobre fundo escuro. */
export const CardColors = {
  bannerPromo: '#7C5C00',
  bannerAd: '#3D3A8C',
  bannerEvent: '#8C2F3D',
  couponFood: '#5C4033',
  couponAuto: '#2F4858',
  couponBeauty: '#4A3F6B',
  couponDefault: '#3A3A52',
} as const;

/** Sobreposições translúcidas (rgba) usadas em componentes. */
export const Overlays = {
  whiteSoft: 'rgba(255,255,255,0.25)',
  whiteMild: 'rgba(255,255,255,0.75)',
  whiteFaint: 'rgba(255,255,255,0.7)',
  blackSoft: 'rgba(0,0,0,0.25)',
  amberTag: 'rgba(255, 193, 7, 0.2)',
  amberGlow: 'rgba(255, 193, 7, 0.14)',
  goldBorder: 'rgba(212, 175, 55, 0.45)',
  goldSoftBorder: 'rgba(255, 193, 7, 0.15)',
  successTag: 'rgba(34, 197, 94, 0.14)',
  dangerTag: 'rgba(239, 68, 68, 0.14)',
  neutralTag: 'rgba(156, 163, 175, 0.14)',
  hairline: 'rgba(255, 255, 255, 0.05)',
  scrim: 'rgba(0,0,0,0.72)',
} as const;

/** Superfícies translúcidas com borda sutil (efeito de vidro sobre o fundo). */
export const Glass = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  tabBar: 'rgba(18,18,18,0.72)',
} as const;

/** Cores temáticas dos serviços de utilidade pública. */
export const UtilityColors = {
  emergency: '#EF4444',
  civil: '#3B82F6',
  health: '#10B981',
  sanitation: '#F59E0B',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Raio dos cantos. `circle` acompanha a metade de uma caixa de 64px. */
export const Radius = {
  tag: 6,
  chip: 8,
  card: 16,
  cardLarge: 20,
  detailCard: 12,
  iconBox: 14,
  circle: 32,
  pill: 20,
  search: 28,
  avatar: 42,
} as const;

/** Gradientes dos botões de contato da tela de detalhes. */
export const ButtonGradients = {
  whatsapp: ['#25D366', '#128C7E'],
  call: ['#FFD54F', '#D4AF37'],
} as const;

/** Cores de marca dos provedores de login (guideline de cada marca). */
export const BrandColors = {
  googleBg: '#FFFFFF',
  googleText: '#1F1F1F',
  appleBg: '#000000',
  appleText: '#FFFFFF',
} as const;

/** Paleta dedicada da tela de login (fundo escuro + dourado). */
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

/** Gradientes da tela de login (fundo, botão e ondas decorativas). */
export const LoginGradients = {
  background: [LoginColors.backgroundTop, LoginColors.backgroundBottom],
  button: ['#F5B014', '#D48800'],
  waveTop: ['rgba(241, 168, 10, 0.22)', 'rgba(241, 168, 10, 0)'],
  waveBottom: ['rgba(229, 148, 0, 0)', 'rgba(241, 168, 10, 0.16)'],
} as const;

const _fontScale = fluidWidthFactor(375, Dimensions.get('window').width);
const _s = (n: number) => Math.round(n * _fontScale);

export const Type = {
  xs: { size: _s(12), lineHeight: _s(16) },
  sm: { size: _s(14), lineHeight: _s(20) },
  md: { size: _s(16), lineHeight: _s(24) },
  lg: { size: _s(20), lineHeight: _s(28) },
  xg: { size: _s(24), lineHeight: _s(32) },
  caption: 11,
  small: 12,
  body: 13,
  base: 14,
  subtitle: 15,
  cardTitle: 16,
  section: 17,
  title: 18,
  headline: 24,
} as const;

export const FontFamily = {
  heading600: 'Rubik_600SemiBold',
  heading700: 'Rubik_700Bold',
  heading800: 'Rubik_800ExtraBold',
  body400: 'Inter_400Regular',
  body500: 'Inter_500Medium',
  body600: 'Inter_600SemiBold',
  body700: 'Inter_700Bold',
  body800: 'Inter_800ExtraBold',
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const Typography = {
  h1: { fontFamily: FontFamily.heading700, fontSize: _s(28), lineHeight: _s(34), fontWeight: FontWeight.bold },
  h2: { fontFamily: FontFamily.heading700, fontSize: _s(24), lineHeight: _s(32), fontWeight: FontWeight.bold },
  h3: { fontFamily: FontFamily.heading700, fontSize: _s(20), lineHeight: _s(26), fontWeight: FontWeight.bold },
  h4: { fontFamily: FontFamily.heading600, fontSize: _s(18), lineHeight: _s(24), fontWeight: FontWeight.semibold },
  h5: { fontFamily: FontFamily.heading600, fontSize: _s(16), lineHeight: _s(22), fontWeight: FontWeight.semibold },
  body: { fontFamily: FontFamily.body400, fontSize: _s(14), lineHeight: _s(20), fontWeight: FontWeight.regular },
  bodySemibold: { fontFamily: FontFamily.body600, fontSize: _s(14), lineHeight: _s(20), fontWeight: FontWeight.semibold },
  bodyBold: { fontFamily: FontFamily.body700, fontSize: _s(14), lineHeight: _s(20), fontWeight: FontWeight.bold },
  caption: { fontFamily: FontFamily.body400, fontSize: _s(12), lineHeight: _s(16), fontWeight: FontWeight.regular, maxFontSizeMultiplier: 1.4 },
  captionSemibold: { fontFamily: FontFamily.body600, fontSize: _s(12), lineHeight: _s(16), fontWeight: FontWeight.semibold, maxFontSizeMultiplier: 1.4 },
  label: { fontFamily: FontFamily.body700, fontSize: _s(12), lineHeight: _s(16), fontWeight: FontWeight.bold, textTransform: 'uppercase' as const, maxFontSizeMultiplier: 1.4 },
} as const;

/** Sombra/elevação padrão dos cards em carrossel (banners e cupons). */
export const CardShadow = {
  elevation: 3,
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
} as const;

const _rnPlatform = (
  _expoRouterRequire?.('react-native') as { Platform?: { select?: (spec: { ios: number; android: number }) => number } } | undefined
)?.Platform;

export const BottomTabInset = (_rnPlatform?.select ? _rnPlatform.select({ ios: 50, android: 80 }) : 0) ?? 0;
export const MaxContentWidth = 800;

/** Tema de navegação (tabs/stack) alinhado aos tokens da GUIA. */
export const DarkGuiTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: GuiaColors.background,
    card: GuiaColors.background,
    primary: GuiaColors.primary,
    text: GuiaColors.text,
  },
};

/** Paleta light (espelho de GuiaColors). */
export const GuiaColorsLight = {
  background: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1F3',
  primary: '#B8860B',
  primaryDim: '#8A6508',
  text: '#111111',
  textSecondary: '#5B6470',
  textSoft: '#374151',
  border: '#E5E7EB',
  borderSoft: '#F0F0F2',
  success: '#16A34A',
  error: '#DC2626',
  whatsapp: '#25D366',
  coverPlaceholder: '#E5E7EB',
} as const;

export const LightGuiTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: GuiaColorsLight.background,
    card: GuiaColorsLight.background,
    primary: GuiaColorsLight.primary,
    text: GuiaColorsLight.text,
  },
};
