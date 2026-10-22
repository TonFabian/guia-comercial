import type { Company, Coupon, Paginated } from '../../../shared/domain.js';

/** Empresa com os campos de contato substituídos por `null`. */
export type ScrubbedCompany<T extends Company = Company> = Omit<
  T,
  'phone' | 'whatsapp' | 'address'
> & {
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
};

/** Cupom com o código substituído por `null`. */
export type ScrubbedCoupon<T extends Coupon = Coupon> = Omit<T, 'code'> & {
  code: string | null;
};

/** Redação conforme o tipo do item; tipos sem dado sensível passam intactos. */
type Scrubbed<T> = T extends Company
  ? ScrubbedCompany<T>
  : T extends Coupon
    ? ScrubbedCoupon<T>
    : T;

/**
 * Remove os contatos da empresa para quem não está autenticado.
 *
 * O campo vira `null` em vez de sumir para manter o shape estável (o cliente
 * distingue "não informado" de "oculto para convidado"). Puro: devolve uma
 * cópia, nunca muta a entrada.
 */
export function scrubCompany<T extends Company>(
  company: T,
): ScrubbedCompany<T> {
  return { ...company, phone: null, whatsapp: null, address: null };
}

/**
 * Remove o código do cupom para quem não está autenticado.
 *
 * O cupom continua listado (título, desconto, validade); só o código, que é o
 * que resgata a oferta, fica oculto.
 */
export function scrubCoupon<T extends Coupon>(coupon: T): ScrubbedCoupon<T> {
  return { ...coupon, code: null };
}

/**
 * Aplica a redação de convidado em um recurso ou em uma página de recursos.
 *
 * Sem convidado, devolve a mesma referência (nenhum trabalho nem alocação).
 */
export function scrubGuestResponse<T>(
  payload: Paginated<T>,
  guest: boolean,
): Paginated<Scrubbed<T>>;
export function scrubGuestResponse<T>(payload: T, guest: boolean): Scrubbed<T>;
export function scrubGuestResponse(payload: unknown, guest: boolean): unknown {
  if (!guest) {
    return payload;
  }

  if (isPaginated(payload)) {
    return { ...payload, items: payload.items.map(scrubValue) };
  }

  return scrubValue(payload);
}

function scrubValue(value: unknown): unknown {
  if (isCompany(value)) {
    return scrubCompany(value);
  }

  if (isCoupon(value)) {
    return scrubCoupon(value);
  }

  return value;
}

function isPaginated<T>(value: unknown): value is Paginated<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items) &&
    'total' in value &&
    'page' in value &&
    'pageSize' in value
  );
}

function isCompany(value: unknown): value is Company {
  return (
    typeof value === 'object' &&
    value !== null &&
    'slug' in value &&
    'category' in value &&
    'name' in value
  );
}

function isCoupon(value: unknown): value is Coupon {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'company' in value &&
    'title' in value
  );
}
