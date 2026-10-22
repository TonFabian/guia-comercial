import { describe, expect, it } from 'vitest';

import { mapClerkUserToMirror } from './clerk-user.js';

const dados = {
  id: 'user_123',
  first_name: 'Maria',
  last_name: 'Silva',
  email_addresses: [{ id: 'em_1', email_address: 'Maria@Example.com' }],
  primary_email_address_id: 'em_1',
  phone_numbers: [{ id: 'ph_1', phone_number: '+5584999999999' }],
  primary_phone_number_id: 'ph_1',
  image_url: 'https://img.clerk.com/m.png',
};

describe('mapClerkUserToMirror', () => {
  it('mapeia id, nome, email em minúsculas, telefone e imagem', () => {
    const mirror = mapClerkUserToMirror(dados);
    expect(mirror).toEqual({
      clerkId: 'user_123',
      firstName: 'Maria',
      lastName: 'Silva',
      email: 'maria@example.com',
      phone: '+5584999999999',
      imageUrl: 'https://img.clerk.com/m.png',
    });
  });

  it('não define phone/email ausentes', () => {
    const mirror = mapClerkUserToMirror({ id: 'user_x' });
    expect(mirror.phone).toBeUndefined();
    expect(mirror.email).toBeUndefined();
  });
});
