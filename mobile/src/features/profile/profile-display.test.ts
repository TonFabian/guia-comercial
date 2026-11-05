import { describe, expect, it } from 'vitest';

import type { User } from '@/types/domain';

import { profileDisplayName } from './profile-display';

const USUARIO_BASE: User = {
  _id: 'user_1',
  clerkId: 'user_1',
  firstName: 'Maria',
  lastName: 'Silva',
  email: 'maria@example.com',
  role: 'user',
};

describe('profileDisplayName', () => {
  it('retorna Visitante quando não há usuário', () => {
    expect(profileDisplayName(null)).toBe('Visitante');
  });

  it('usa nome e sobrenome quando presentes', () => {
    expect(profileDisplayName(USUARIO_BASE)).toBe('Maria Silva');
  });

  it('usa o e-mail quando não há nome', () => {
    expect(profileDisplayName({ ...USUARIO_BASE, firstName: undefined, lastName: undefined })).toBe(
      'maria@example.com',
    );
  });
});
