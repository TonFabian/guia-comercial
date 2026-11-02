import { describe, expect, it } from 'vitest';

import {
  EMERGENCY_PHONES,
  PUBLIC_UTILITIES,
  resolveUtilityDestination,
} from './public-utility';
import type { PublicUtility } from './public-utility';

function findUtility(id: string): PublicUtility {
  const utility = PUBLIC_UTILITIES.find((item) => item.id === id);
  if (!utility) throw new Error(`Atalho de utilidade não encontrado: ${id}`);
  return utility;
}

describe('atalhos de utilidade pública', () => {
  it('expõe cinco atalhos de utilidade pública', () => {
    expect(PUBLIC_UTILITIES).toHaveLength(5);
  });

  it('mantém os ids dos atalhos únicos', () => {
    const ids = PUBLIC_UTILITIES.map((utility) => utility.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preenche título e descrição de todos os atalhos', () => {
    for (const utility of PUBLIC_UTILITIES) {
      expect(utility.title.trim()).not.toBe('');
      expect(utility.description.trim()).not.toBe('');
    }
  });

  it('lista os telefones de emergência nacionais', () => {
    expect(EMERGENCY_PHONES.map((phone) => phone.number)).toEqual(['190', '193', '192']);
  });
});

describe('destino dos atalhos de utilidade pública', () => {
  it('abre a empresa de farmácia de plantão', () => {
    const destination = resolveUtilityDestination(findUtility('pharmacy'), 'company-1');

    expect(destination).toEqual({ kind: 'company', companyId: 'company-1' });
  });

  it('leva à busca quando não há farmácia de plantão', () => {
    const destination = resolveUtilityDestination(findUtility('pharmacy'), null);

    expect(destination).toEqual({ kind: 'search', term: 'farmácia' });
  });

  it('abre o modal de telefones de emergência', () => {
    const destination = resolveUtilityDestination(findUtility('emergency-phones'), null);

    expect(destination).toEqual({ kind: 'emergency-phones' });
  });

  it('leva à busca de postos de combustível', () => {
    const destination = resolveUtilityDestination(findUtility('fuel'), null);

    expect(destination).toEqual({ kind: 'search', term: 'posto de combustível' });
  });

  it('leva à busca de ônibus', () => {
    const destination = resolveUtilityDestination(findUtility('bus'), null);

    expect(destination).toEqual({ kind: 'search', term: 'ônibus' });
  });

  it('leva à busca de coleta de lixo', () => {
    const destination = resolveUtilityDestination(findUtility('trash'), null);

    expect(destination).toEqual({ kind: 'search', term: 'coleta de lixo' });
  });
});
