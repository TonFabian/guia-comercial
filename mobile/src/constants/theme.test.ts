import { describe, it, expect, vi } from 'vitest';

const { width } = vi.hoisted(() => ({ width: 375 }));
vi.mock('react-native', () => ({
  Dimensions: { get: () => ({ width, height: 812 }) },
}));

import { FontFamily, FontWeight, Type, Typography } from './theme';

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
    expect((Typography.label as any).textTransform).toBe('uppercase');
    expect((Typography.label as any).maxFontSizeMultiplier).toBe(1.4);
  });
});
