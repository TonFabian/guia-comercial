import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';

import { buildCompanyActions, instagramUrl } from './company-actions';

const EMPRESA_BASE: Company = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Barbearia Central',
  slug: 'barbearia-central',
  description: 'Cortes e barba.',
  category: 'beleza',
};

describe('buildCompanyActions', () => {
  it('não oferece ações que não têm dado para executar', () => {
    const acoes = buildCompanyActions(EMPRESA_BASE);

    expect(acoes.map((acao) => acao.kind)).toEqual(['share']);
  });

  it('oferece contato, mapa e redes quando os dados existem', () => {
    const acoes = buildCompanyActions({
      ...EMPRESA_BASE,
      phone: '+55 85 99999-0005',
      whatsapp: '+55 85 99999-0005',
      address: 'Rua Padre Morais, 77',
      website: 'https://barbeariacentral.com.br',
      instagram: '@barbeariacentral',
      facebook: 'https://facebook.com/barbeariacentral',
    });

    expect(acoes.map((acao) => acao.kind)).toEqual([
      'whatsapp',
      'call',
      'map',
      'website',
      'instagram',
      'facebook',
      'share',
    ]);
  });

  it('ignora telefone em branco', () => {
    const acoes = buildCompanyActions({ ...EMPRESA_BASE, phone: '   ' });

    expect(acoes.map((acao) => acao.kind)).not.toContain('call');
  });

  it('usa a url normalizada do Instagram na ação', () => {
    const acoes = buildCompanyActions({ ...EMPRESA_BASE, instagram: '@barbeariacentral' });
    const instagram = acoes.find((acao) => acao.kind === 'instagram');

    expect(instagram?.value).toBe('https://instagram.com/barbeariacentral');
  });

  it('mantém a url do site na ação', () => {
    const acoes = buildCompanyActions({ ...EMPRESA_BASE, website: 'https://exemplo.com' });
    const site = acoes.find((acao) => acao.kind === 'website');

    expect(site?.value).toBe('https://exemplo.com');
  });
});

describe('instagramUrl', () => {
  it('normaliza um perfil com @', () => {
    expect(instagramUrl('@barbeariacentral')).toBe('https://instagram.com/barbeariacentral');
  });

  it('normaliza um perfil sem @', () => {
    expect(instagramUrl('barbeariacentral')).toBe('https://instagram.com/barbeariacentral');
  });

  it('preserva uma url completa', () => {
    expect(instagramUrl('https://instagram.com/barbeariacentral')).toBe(
      'https://instagram.com/barbeariacentral',
    );
  });

  it('devolve null para valor vazio', () => {
    expect(instagramUrl('')).toBeNull();
  });
});
