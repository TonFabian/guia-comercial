import { describe, it, expect, vi } from 'vitest';

import { FontFamily, Type, Typography } from './theme';

const { width } = vi.hoisted(() => ({ width: 375 }));
vi.mock('react-native', () => ({
  Dimensions: { get: () => ({ width, height: 812 }) },
  Platform: { select: ({ ios }: { ios: number }) => ios },
}));
vi.mock('expo-router', () => ({
  DarkTheme: {
    dark: true,
    colors: {
      primary: 'rgb(10, 132, 255)',
      background: 'rgb(1, 1, 1)',
      card: 'rgb(18, 18, 18)',
      text: 'rgb(229, 229, 231)',
      border: 'rgb(39, 39, 41)',
      notification: 'rgb(255, 69, 58)',
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  },
}));

describe('tokens de tipografia', () => {
  it('FontFamily expõe uma família por peso carregado', () => {
    expect(FontFamily.heading700).toBe('Rubik_700Bold');
    expect(FontFamily.body400).toBe('Inter_400Regular');
  });
  it('escada xs..xg tem size/line pareados', () => {
    expect(Type.xs).toEqual({ size: 12, lineHeight: 16 });
    expect(Type.xg).toEqual({ size: 24, lineHeight: 32 });
  });
  it('presets carregam família + tamanho + line + peso', () => {
    for (const p of [Typography.h1, Typography.body, Typography.label]) {
      expect(p).toHaveProperty('fontFamily');
      expect(p).toHaveProperty('fontSize');
      expect(p).toHaveProperty('lineHeight');
      expect(p).toHaveProperty('fontWeight');
    }
  });
  it('h1..h5 usam Rubik; body/caption/label usam Inter', () => {
    expect(Typography.h1.fontFamily).toContain('Rubik');
    expect(Typography.body.fontFamily).toContain('Inter');
    expect(Typography.label.fontFamily).toContain('Inter');
  });
  it('label tem uppercase e maxFontSizeMultiplier 1.4', () => {
    const label = Typography.label as { textTransform?: string; maxFontSizeMultiplier?: number };
    expect(label.textTransform).toBe('uppercase');
    expect(label.maxFontSizeMultiplier).toBe(1.4);
  });
});
