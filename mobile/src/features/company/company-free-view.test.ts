import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';

import { buildCompanyFreeView, companyDetailVariant } from './company-free-view';

function empresa(overrides: Partial<Company> & { _id: string }): Company {
  return {
    name: `Empresa ${overrides._id}`,
    slug: `empresa-${overrides._id}`,
    description: 'Descrição da empresa.',
    category: '1',
    ...overrides,
  };
}

const SEGUNDA_MEIO_DIA = new Date(2026, 10, 9, 12, 0, 0);
const SEGUNDA_NOITE = new Date(2026, 10, 9, 20, 0, 0);
const TERCA_MEIO_DIA = new Date(2026, 10, 10, 12, 0, 0);

describe('companyDetailVariant', () => {
  it('usa a tela completa para empresa em destaque', () => {
    expect(companyDetailVariant(empresa({ _id: '1', isFeatured: true }))).toBe('full');
  });

  it('usa a tela enxuta para empresa sem destaque', () => {
    expect(companyDetailVariant(empresa({ _id: '1', isFeatured: false }))).toBe('free');
  });

  it('usa a tela enxuta quando isFeatured não está definido', () => {
    expect(companyDetailVariant(empresa({ _id: '1' }))).toBe('free');
  });
});

describe('buildCompanyFreeView', () => {
  it('usa a capa, cai para o logo e fica sem imagem quando não há nenhuma', () => {
    const comCapa = buildCompanyFreeView(
      empresa({ _id: '1', cover: 'capa.jpg', logo: 'logo.jpg' }),
      SEGUNDA_MEIO_DIA,
    );
    expect(comCapa.coverUrl).toBe('capa.jpg');

    const semCapa = buildCompanyFreeView(empresa({ _id: '1', logo: 'logo.jpg' }), SEGUNDA_MEIO_DIA);
    expect(semCapa.coverUrl).toBe('logo.jpg');

    const semImagem = buildCompanyFreeView(empresa({ _id: '1' }), SEGUNDA_MEIO_DIA);
    expect(semImagem.coverUrl).toBeUndefined();
  });

  it('formata a categoria e usa fallback para descrição vazia', () => {
    const view = buildCompanyFreeView(
      empresa({ _id: '1', category: 'Padaria', description: '   ' }),
      SEGUNDA_MEIO_DIA,
    );

    expect(view.category).toBe('Padaria');
    expect(view.description).toBe('Informações em breve.');
  });

  it('combina cidade e endereço na linha de localização', () => {
    const view = buildCompanyFreeView(
      empresa({
        _id: '1',
        city: { _id: 'c1', name: 'Castelo do Piauí', slug: 'castelo', state: 'PI' },
        address: 'Rua A, 10',
      }),
      SEGUNDA_MEIO_DIA,
    );

    expect(view.addressLine).toBe('Castelo do Piauí • Rua A, 10');
  });

  it('calcula o status de funcionamento a partir do schedule', () => {
    const schedule = [{ day: 1, opens: 480, closes: 1080 }];

    const aberto = buildCompanyFreeView(empresa({ _id: '1', schedule }), SEGUNDA_MEIO_DIA);
    expect(aberto.status).toEqual({ kind: 'open', label: 'Aberto agora', tone: 'success' });

    const fechado = buildCompanyFreeView(empresa({ _id: '1', schedule }), SEGUNDA_NOITE);
    expect(fechado.status).toEqual({ kind: 'closed', label: 'Fechado agora', tone: 'error' });

    const desconhecido = buildCompanyFreeView(empresa({ _id: '1' }), SEGUNDA_MEIO_DIA);
    expect(desconhecido.status).toEqual({ kind: 'unknown', label: 'Consulte', tone: 'muted' });
  });

  it('fecha em dia sem faixa mesmo quando o bucket da semana tem horário', () => {
    const schedule = [{ day: 1, opens: 480, closes: 1080 }];

    const view = buildCompanyFreeView(empresa({ _id: '1', schedule }), TERCA_MEIO_DIA);

    expect(view.status).toEqual({ kind: 'closed', label: 'Fechado agora', tone: 'error' });
  });

  it('marca as três linhas como consulta quando não há schedule', () => {
    const view = buildCompanyFreeView(empresa({ _id: '1' }), SEGUNDA_MEIO_DIA);

    expect(view.hoursRows).toEqual([
      { key: 'weekdays', label: 'Segunda à sexta', value: 'Consulte a empresa', closed: true },
      { key: 'saturday', label: 'Sábado', value: 'Consulte a empresa', closed: true },
      { key: 'sunday', label: 'Domingo', value: 'Consulte a empresa', closed: true },
    ]);
  });

  it('usa o nome da categoria quando ela vem populada', () => {
    const view = buildCompanyFreeView(
      empresa({ _id: '1', category: { _id: 'c1', name: 'Padaria', slug: 'padaria' } }),
      SEGUNDA_MEIO_DIA,
    );

    expect(view.category).toBe('Padaria');
  });

  it('monta as três linhas de horário e marca os dias fechados', () => {
    const view = buildCompanyFreeView(
      empresa({
        _id: '1',
        schedule: [
          { day: 1, opens: 480, closes: 1080 },
          { day: 2, opens: 480, closes: 1080 },
          { day: 3, opens: 480, closes: 1080 },
          { day: 4, opens: 480, closes: 1080 },
          { day: 5, opens: 480, closes: 1080 },
          { day: 6, opens: 480, closes: 720 },
        ],
      }),
      SEGUNDA_MEIO_DIA,
    );

    expect(view.hoursRows).toEqual([
      { key: 'weekdays', label: 'Segunda à sexta', value: '08h às 18h', closed: false },
      { key: 'saturday', label: 'Sábado', value: '08h às 12h', closed: false },
      { key: 'sunday', label: 'Domingo', value: 'Fechado', closed: true },
    ]);
  });

  it('expõe os contatos e sinaliza quando não há nenhum', () => {
    const comContato = buildCompanyFreeView(
      empresa({ _id: '1', phone: '86999999999', whatsapp: '86988888888' }),
      SEGUNDA_MEIO_DIA,
    );
    expect(comContato.phone).toBe('86999999999');
    expect(comContato.whatsapp).toBe('86988888888');
    expect(comContato.hasContact).toBe(true);

    const semContato = buildCompanyFreeView(
      empresa({ _id: '1', phone: null, whatsapp: null }),
      SEGUNDA_MEIO_DIA,
    );
    expect(semContato.phone).toBeUndefined();
    expect(semContato.whatsapp).toBeUndefined();
    expect(semContato.hasContact).toBe(false);
  });
});
