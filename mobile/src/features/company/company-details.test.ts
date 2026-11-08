import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';

import { buildCompanyDetails } from './company-details';

function empresa(overrides: Partial<Company> & { _id: string }): Company {
  return {
    name: `Empresa ${overrides._id}`,
    slug: `empresa-${overrides._id}`,
    description: 'Descrição da empresa.',
    category: '1',
    ...overrides,
  };
}

describe('buildCompanyDetails — workingHours', () => {
  it('deriva os horários do schedule estruturado quando ele existe', () => {
    const detalhes = buildCompanyDetails(
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
    );

    expect(detalhes.workingHours.weekdays).toContain('08h');
    expect(detalhes.workingHours.weekdays).toContain('18h');
    expect(detalhes.workingHours.saturday).toContain('08h');
    expect(detalhes.workingHours.sunday).toBe('Fechado');
  });

  it('mantém "Consulte a empresa" quando o schedule vem vazio', () => {
    const detalhes = buildCompanyDetails(
      empresa({
        _id: '1',
        schedule: [],
      }),
    );

    expect(detalhes.workingHours).toEqual({
      weekdays: 'Consulte a empresa',
      saturday: 'Consulte a empresa',
      sunday: 'Consulte a empresa',
    });
  });

  it('mantém "Consulte a empresa" quando não há horário nenhum', () => {
    const detalhes = buildCompanyDetails(empresa({ _id: '1' }));

    expect(detalhes.workingHours).toEqual({
      weekdays: 'Consulte a empresa',
      saturday: 'Consulte a empresa',
      sunday: 'Consulte a empresa',
    });
  });
});
