import '@/global.css';

import { Platform } from 'react-native';

export const GuiaColors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#242424',
  primary: '#FFC107',
  primaryDim: '#B8860B',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#2E2E2E',
  success: '#22C55E',
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
  blackSoft: 'rgba(0,0,0,0.55)',
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
  iconBox: 14,
  circle: 32,
  pill: 20,
  search: 28,
  avatar: 42,
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
