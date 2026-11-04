import { describe, expect, it } from 'vitest';

import type { PublicUtility } from '@/types/domain';

import { DEFAULT_UTILITY_ICON, resolveUtilityIcon, toUtilityView } from './public-utility-view';

const PALETA = {
  emergency: '#EF4444',
  civil: '#3B82F6',
  health: '#10B981',
  sanitation: '#F59E0B',
};

const ICONES_CONHECIDOS = new Set(['shield-alert', 'hospital-building']);

function utilidade(overrides: Partial<PublicUtility> = {}): PublicUtility {
  return {
    _id: 'policia-militar',
    name: 'Polícia Militar',
    description: 'Emergência',
    category: 'emergency',
    active: true,
    ...overrides,
  };
}

describe('resolveUtilityIcon', () => {
  it('aceita um ícone que existe na fonte de ícones', () => {
    expect(resolveUtilityIcon('shield-alert', ICONES_CONHECIDOS)).toBe('shield-alert');
  });

  it('usa o ícone padrão quando o nome não existe', () => {
    expect(resolveUtilityIcon('icone-que-nao-existe', ICONES_CONHECIDOS)).toBe(
      DEFAULT_UTILITY_ICON,
    );
  });

  it('usa o ícone padrão quando o dado não informa ícone', () => {
    expect(resolveUtilityIcon(undefined, ICONES_CONHECIDOS)).toBe(DEFAULT_UTILITY_ICON);
  });
});

describe('toUtilityView', () => {
  it('deriva a cor da categoria a partir do tema', () => {
    const view = toUtilityView(utilidade({ category: 'health' }), PALETA, ICONES_CONHECIDOS);

    expect(view.accent).toBe('#10B981');
  });

  it('mantém o ícone informado quando ele é válido', () => {
    const view = toUtilityView(utilidade({ icon: 'shield-alert' }), PALETA, ICONES_CONHECIDOS);

    expect(view.icon).toBe('shield-alert');
  });

  it('substitui um ícone inválido pelo padrão', () => {
    const view = toUtilityView(utilidade({ icon: 'nao-existe' }), PALETA, ICONES_CONHECIDOS);

    expect(view.icon).toBe(DEFAULT_UTILITY_ICON);
  });

  it('libera a ligação direta quando há telefone', () => {
    const view = toUtilityView(utilidade({ phone: '190' }), PALETA, ICONES_CONHECIDOS);

    expect(view.canCall).toBe(true);
    expect(view.phone).toBe('190');
  });

  it('abre os detalhes quando não há telefone', () => {
    const view = toUtilityView(utilidade({ phone: '  ' }), PALETA, ICONES_CONHECIDOS);

    expect(view.canCall).toBe(false);
    expect(view.phone).toBeNull();
  });

  it('leva os detalhes e o id para o card', () => {
    const view = toUtilityView(
      utilidade({ _id: 'coleta', details: ['Segunda e quinta'] }),
      PALETA,
      ICONES_CONHECIDOS,
    );

    expect(view.id).toBe('coleta');
    expect(view.details).toEqual(['Segunda e quinta']);
  });
});
