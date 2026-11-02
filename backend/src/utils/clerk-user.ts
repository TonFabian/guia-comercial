import type { User } from '../../../shared/domain.js';

/** Dados de usuário vindos do webhook ou da Backend API do Clerk. */
export interface ClerkUserData {
  id: string;
  first_name?: string;
  last_name?: string;
  email_addresses?: Array<{ id: string; email_address: string }>;
  primary_email_address_id?: string;
  phone_numbers?: Array<{ phone_number: string; id: string }>;
  primary_phone_number_id?: string;
  image_url?: string;
}

/**
 * Converte o usuário do Clerk no espelho local (`User`).
 *
 * Puro de propósito: quem decide persistir é o service, nunca esta função.
 * Campos ausentes no Clerk não entram no resultado, para não apagar dado
 * já gravado ao aplicar o `$set` do upsert.
 */
export function mapClerkUserToMirror(data: ClerkUserData): Partial<User> {
  const mirror: Partial<User> = { clerkId: data.id };

  if (data.first_name) {
    mirror.firstName = data.first_name;
  }

  if (data.last_name) {
    mirror.lastName = data.last_name;
  }

  const email = findPrimaryEmail(data);
  if (email) {
    mirror.email = email.toLowerCase();
  }

  const phone = findPrimaryPhone(data);
  if (phone) {
    mirror.phone = phone;
  }

  if (data.image_url) {
    mirror.imageUrl = data.image_url;
  }

  return mirror;
}

// Somente o endereço principal do Clerk conta: sem fallback para o primeiro
// da lista, porque outro e-mail/telefone pode não ser do usuário.
function findPrimaryEmail(data: ClerkUserData): string | undefined {
  return data.email_addresses?.find(
    (email) => email.id === data.primary_email_address_id,
  )?.email_address;
}

function findPrimaryPhone(data: ClerkUserData): string | undefined {
  return data.phone_numbers?.find(
    (telefone) => telefone.id === data.primary_phone_number_id,
  )?.phone_number;
}
