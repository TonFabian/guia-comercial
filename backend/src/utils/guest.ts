import type { Company, Coupon, Job, Paginated } from '../../../shared/domain.js';

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

/** Referência de empresa: populada é redigida, string (id) permanece. */
type ScrubbedCompanyReference<C> = C extends Company ? ScrubbedCompany<C> : C;

/** Redação conforme o tipo do item; tipos sem dado sensível passam intactos. */
type Scrubbed<T> = T extends Company
  ? ScrubbedCompany<T>
  : T extends Coupon
    ? Omit<T, 'code' | 'company'> & {
        code: string | null;
        company: ScrubbedCompanyReference<T['company']>;
      }
    : T extends Job
      ? Omit<T, 'company'> & {
          company: ScrubbedCompanyReference<T['company']>;
        }
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
 * Com convidado, `true` garante o tipo redigido; `false` mantém o tipo
 * original — por isso os overloads por literal, em vez de um `boolean` que
 * prometeria redação no ramo que devolve o payload intacto.
 */
export function scrubGuestResponse<T>(
  payload: Paginated<T>,
  guest: true,
): Paginated<Scrubbed<T>>;
export function scrubGuestResponse<T>(payload: T, guest: true): Scrubbed<T>;
export function scrubGuestResponse<T>(
  payload: Paginated<T>,
  guest: false,
): Paginated<T>;
export function scrubGuestResponse<T>(payload: T, guest: false): T;
export function scrubGuestResponse<T>(
  payload: Paginated<T>,
  guest: boolean,
): Paginated<Scrubbed<T>> | Paginated<T>;
export function scrubGuestResponse<T>(
  payload: T,
  guest: boolean,
): Scrubbed<T> | T;
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
  if (!isRecord(value)) {
    return value;
  }

  if (isCompany(value)) {
    return scrubCompany(value);
  }

  const scrubbed: object = isCoupon(value) ? scrubCoupon(value) : value;
  const nested = readPopulatedCompany(value);

  if (!nested) {
    return scrubbed;
  }

  // Vazar contato via recurso aninhado (cupom/vaga) burlaria a redação:
  // a empresa populada recebe o mesmo tratamento do topo.
  return { ...scrubbed, company: scrubCompany(nested) };
}

function readPopulatedCompany(
  value: Record<string, unknown>,
): Company | undefined {
  return isCompany(value.company) ? value.company : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPaginated<T>(value: unknown): value is Paginated<T> {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    'total' in value &&
    'page' in value &&
    'pageSize' in value
  );
}

function isCompany(value: unknown): value is Company {
  return (
    isRecord(value) &&
    'slug' in value &&
    'category' in value &&
    'name' in value
  );
}

function isCoupon(value: unknown): value is Coupon {
  return (
    isRecord(value) &&
    'code' in value &&
    'company' in value &&
    'title' in value
  );
}
