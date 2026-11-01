import '@/global.css';

import { DarkTheme } from 'expo-router';
import { Platform } from 'react-native';

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

export const Type = {
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

/** Sombra/elevação padrão dos cards em carrossel (banners e cupons). */
export const CardShadow = {
  elevation: 3,
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Tema de navegação (tabs/stack) alinhado aos tokens da GUIA. */
export const DarkGuiTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: GuiaColors.background,
    card: GuiaColors.background,
    primary: GuiaColors.primary,
    text: GuiaColors.text,
  },
};
