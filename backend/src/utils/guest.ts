import type {
  AutonomousProfessional,
  Company,
  Coupon,
  Job,
  Paginated,
  TourEvent,
  TourEventScheduleItem,
  TouristSpot,
} from '../../../shared/domain.js';

/** Empresa com os campos de contato substituídos por `null`. */
export type ScrubbedCompany<T extends Company = Company> = Omit<
  T,
  'phone' | 'whatsapp' | 'address'
> & {
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
};

/** Profissional autônomo com os campos de contato substituídos por `null`. */
export type ScrubbedAutonomousProfessional<T extends AutonomousProfessional = AutonomousProfessional> = Omit<
  T,
  'phone' | 'whatsapp'
> & {
  phone: string | null;
  whatsapp: string | null;
};

/** Cupom com o código substituído por `null`. */
export type ScrubbedCoupon<T extends Coupon = Coupon> = Omit<T, 'code'> & {
  code: string | null;
};

/** Referência de empresa: populada é redigida, string (id) permanece. */
type ScrubbedCompanyReference<C> = C extends Company ? ScrubbedCompany<C> : C;

/** Referência de ponto turístico: populada é redigida, string (id/slug) permanece. */
type ScrubbedSpotReference<S> = S extends TouristSpot ? ScrubbedTouristSpot<S> : S;

/** Item da programação com o atrativo populado redigido. */
type ScrubbedTourEventScheduleItem<T extends TourEventScheduleItem = TourEventScheduleItem> = Omit<
  T,
  'relatedSpot'
> & {
  relatedSpot: ScrubbedSpotReference<T['relatedSpot']>;
};

/**
 * Programação do evento: itens com o atrativo populado redigido.
 * Condicional nude distribui sobre o união `[] | undefined` (campo opcional):
 * sem programação, o tipo original (undefined) permanece.
 */
type ScrubbedSchedule<S> = S extends TourEventScheduleItem[]
  ? ScrubbedTourEventScheduleItem<S[number]>[]
  : S;

/**
 * Ponto turístico com os contatos redigidos e a empresa relacionada
 * tratada como referência redigida.
 *
 * `address` fica FORA da redação: no turismo o endereço é informação
 * pública (spec D14) — é o "onde fica o atrativo" que leva o turista lá,
 * diferente do endereço comercial da empresa.
 */
export type ScrubbedTouristSpot<T extends TouristSpot = TouristSpot> = Omit<
  T,
  'phone' | 'whatsapp' | 'relatedCompany'
> & {
  phone: string | null;
  whatsapp: string | null;
  relatedCompany: ScrubbedCompanyReference<T['relatedCompany']>;
};

/** Evento turístico com os contatos redigidos — mesmas razões do spot. */
export type ScrubbedTourEvent<T extends TourEvent = TourEvent> = Omit<
  T,
  'phone' | 'whatsapp' | 'organizerCompany' | 'schedule'
> & {
  phone: string | null;
  whatsapp: string | null;
  organizerCompany: ScrubbedCompanyReference<T['organizerCompany']>;
  schedule: ScrubbedSchedule<T['schedule']>;
};

/**
 * Redação conforme o tipo do item; tipos sem dado sensível passam intactos.
 *
 * As ramificações de turismo vêm ANTES de `Company`: `TouristSpot` e
 * `TourEvent` são estruturalmente atribuíveis a `Company` (têm
 * slug + category + name), então o `extends Company` capturaria primeiro e
 * produziria o tipo errado (redigiria `address`, que é público no turismo).
 */
type Scrubbed<T> = T extends TourEvent
  ? ScrubbedTourEvent<T>
  : T extends TouristSpot
    ? ScrubbedTouristSpot<T>
    : T extends Company
      ? ScrubbedCompany<T>
      : T extends AutonomousProfessional
        ? ScrubbedAutonomousProfessional<T>
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
 * Remove os contatos do profissional autônomo para quem não está autenticado.
 */
export function scrubAutonomousProfessional<T extends AutonomousProfessional>(
  professional: T,
): ScrubbedAutonomousProfessional<T> {
  return { ...professional, phone: null, whatsapp: null };
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

/**
 * Remove os contatos do ponto turístico para quem não está autenticado.
 *
 * O endereço fica: no turismo ele é público (spec D14) — é a localização do
 * atrativo, não um dado comercial. Já a empresa relacionada populada é
 * redigida via `scrubCompany`: deixar o contato dela passar por dentro do
 * burlaria a redação (mesma razão do cupom e da vaga).
 */
export function scrubTouristSpot<T extends TouristSpot>(
  spot: T,
): ScrubbedTouristSpot<T> {
  return {
    ...spot,
    phone: null,
    whatsapp: null,
    relatedCompany: redigirReferenciaEmpresa(
      spot.relatedCompany,
    ) as ScrubbedTouristSpot<T>['relatedCompany'],
  };
}

/**
 * Remove os contatos do evento turístico para quem não está autenticado.
 *
 * Endereço preservado pelo mesmo motivo do spot (lugar público, spec D14);
 * a empresa organizadora populada segue o padrão do cupom/vaga. E cada item
 * da programação tem o atrativo populado redigido via `redigirProgramacao`.
 */
export function scrubTourEvent<T extends TourEvent>(
  event: T,
): ScrubbedTourEvent<T> {
  return {
    ...event,
    phone: null,
    whatsapp: null,
    organizerCompany: redigirReferenciaEmpresa(
      event.organizerCompany,
    ) as ScrubbedTourEvent<T>['organizerCompany'],
    schedule: redigirProgramacao(
      event.schedule,
    ) as ScrubbedTourEvent<T>['schedule'],
  };
}

/**
 * Redige o atrativo populado de cada item da programação do evento.
 *
 * O `relatedSpot` populado passa pelo mesmo `scrubTouristSpot` da leitura
 * direta — que, por dentro, também redige a empresa aninhada (a recursão
 * mora no spot, não aqui). Referência por string (id/slug, não populado) e
 * itens sem atrativo não têm objeto de onde vazar contato. Quando nenhum
 * item tem atrativo populado, a lista original volta pela referência
 * (zero alocação).
 */
function redigirProgramacao(
  programacao: TourEventScheduleItem[] | undefined,
): TourEventScheduleItem[] | undefined {
  if (programacao === undefined) {
    return undefined;
  }

  let temSpotRedigido = false;
  const itensRedigidos = programacao.map((item) => {
    if (!isTouristSpot(item.relatedSpot)) {
      return item;
    }
    temSpotRedigido = true;
    return { ...item, relatedSpot: scrubTouristSpot(item.relatedSpot) };
  });

  return temSpotRedigido ? itensRedigidos : programacao;
}

/**
 * Redige só a empresa populada numa referência de empresa.
 *
 * String (id/slug, não populado) e `undefined` passam intactos — não há
 * objeto de onde vazar contato.
 */
function redigirReferenciaEmpresa(ref: unknown): unknown {
  return isCompany(ref) ? scrubCompany(ref) : ref;
}

function scrubValue(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  // Ordem IMPORTA: spot/evento têm slug + category + name e seriam capturados
  // pelo detector por shape da Company — que redigiria o endereço público e
  // ignoraria a empresa aninhada. Os detectores explícitos de turismo testam
  // discriminadores que a Company não tem (active, startDate/endDate).
  if (isTourEvent(value)) {
    return scrubTourEvent(value);
  }

  if (isTouristSpot(value)) {
    return scrubTouristSpot(value);
  }

  if (isCompany(value)) {
    return scrubCompany(value);
  }

  if (isAutonomousProfessional(value)) {
    return scrubAutonomousProfessional(value);
  }

  const scrubbed = isCoupon(value) ? scrubCoupon(value) : value;
  return redigirEmpresasAninhadas(scrubbed);
}

/** Referências de empresa que podem vir populadas num recurso. */
const CAMPOS_EMPRESA = ['company', 'relatedCompany', 'organizerCompany'] as const;

/**
 * Redige TODA empresa populada aninhada (cupom/vaga e turismo).
 * Só toca no objeto quando existe referência populada: caso contrário o
 * payload original volta pela mesma referência (zero alocação).
 */
function redigirEmpresasAninhadas(value: object): object {
  let resultado: object = value;
  for (const campo of CAMPOS_EMPRESA) {
    const ref = (value as Record<string, unknown>)[campo];
    if (isCompany(ref)) {
      resultado = { ...resultado, [campo]: scrubCompany(ref) };
    }
  }
  return resultado;
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

/**
 * Discriminadores do evento turístico: `startDate` + `endDate` são
 * obrigatórios no evento e inexistem em Company, Spot e Banner. Testado
 * ANTES do `isTouristSpot`, porque o evento também casa com o shape dele.
 */
function isTourEvent(value: unknown): value is TourEvent {
  return isRecord(value) && 'startDate' in value && 'endDate' in value;
}

/**
 * Discriminadores do ponto turístico: `slug` + `category` + `name` + `active`.
 * O `active` separa da Company (que tem `isFeatured`); o `slug` separa da
 * PublicUtility (que tem `active` mas não tem `slug`) e do Banner (que não
 * tem slug/category).
 */
function isTouristSpot(value: unknown): value is TouristSpot {
  return (
    isRecord(value) &&
    'slug' in value &&
    'category' in value &&
    'name' in value &&
    'active' in value
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

export function isAutonomousProfessional(
  value: unknown,
): value is AutonomousProfessional {
  return (
    isRecord(value) &&
    'slug' in value &&
    'name' in value &&
    'specialty' in value
  );
}
