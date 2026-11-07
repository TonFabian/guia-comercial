import { z } from 'zod';

import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug deve estar em kebab-case (ex.: restaurantes)');

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'id inválido');

/**
 * URL segura para campos de link (website, ticketUrl, facebook).
 *
 * Defesa em profundidade no backend: o app abre esses valores com
 * `Linking.openURL` (no web → `window.open`), então um esquema perigoso
 * (javascript:, data:, vbscript:, file:, blob:, about:) pode virar XSS/abuso.
 * A validação rejeita apenas esquemas perigosos conhecidos e exige http(s)
 * quando há esquema explícito; domínios "bare" (sem esquema) são aceitos
 * para não quebrar dados já gravados.
 */
const urlSeguraSchema = z
  .string()
  .trim()
  .refine((valor) => {
    const minusc = valor.toLowerCase();
    // Esquemas perigosos conhecidos (mesmo com espaços antes do ':').
    if (/^\s*(javascript|vbscript|data|file|blob|about):/i.test(valor)) {
      return false;
    }
    const esquema = minusc.match(/^([a-z][a-z0-9+.-]*):/);
    if (esquema) {
      const proto = esquema[1];
      return proto === 'http' || proto === 'https';
    }
    return true;
  }, 'URL inválida ou esquema não permitido (use http:// ou https://)');

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'data inválida (use ISO 8601)');

/** Helper que valida o body com um schema zod e aborta com 422 em caso de erro. */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ error: 'Payload inválido', details: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  icon: z.string().optional(),
  order: z.number().int().optional(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

const companyProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  image: z.string().optional(),
});

/**
 * Item do horário de funcionamento estruturado da empresa: `schedule` é a
 * fonte da verdade e `openingHours` (texto livre) está em deprecação.
 */
export const scheduleItemSchema = z.object({
  day: z.number().int().min(0).max(6),
  opens: z.number().int().min(0).max(1439),
  closes: z.number().int().min(0).max(1439),
});

export const createCompanySchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  description: z.string().min(1),
  promotion: z.string().optional(),
  category: objectIdSchema,
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  city: z.string().trim().min(1).nullish(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  logo: z.string().optional(),
  cover: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  registry: z.string().optional(),
  isFeatured: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().nonnegative().optional(),
  isVerified: z.boolean().optional(),
  website: urlSeguraSchema.optional(),
  instagram: z.string().optional(),
  facebook: urlSeguraSchema.optional(),
  // Deprecated: schedule estruturado é a fonte da verdade; o texto livre
  // permanece aceito e emitido até o rollout do app (fase final remove).
  openingHours: z.array(z.string()).meta({ deprecated: true }).optional(),
  schedule: z.array(scheduleItemSchema).optional(),
  services: z.array(z.string()).optional(),
  products: z.array(companyProductSchema).optional(),
});

export type CreateCompanyDto = z.infer<typeof createCompanySchema>;

export type UpdateCompanyDto = Partial<CreateCompanyDto>;

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

export const createBannerSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  link: z.string().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export type CreateBannerDto = z.infer<typeof createBannerSchema>;

export type UpdateBannerDto = Partial<CreateBannerDto>;

// ---------------------------------------------------------------------------
// Coupon
// ---------------------------------------------------------------------------

export const createCouponSchema = z.object({
  title: z.string().min(1),
  company: objectIdSchema,
  code: z.string().min(1),
  discount: z.string().optional(),
  description: z.string().optional(),
  expiresAt: isoDate.optional(),
});

export type CreateCouponDto = z.infer<typeof createCouponSchema>;

export type UpdateCouponDto = Omit<Partial<CreateCouponDto>, 'company'>;

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export const createJobSchema = z.object({
  title: z.string().min(1),
  company: objectIdSchema,
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
});

export type CreateJobDto = z.infer<typeof createJobSchema>;

export type UpdateJobDto = Omit<Partial<CreateJobDto>, 'company'>;

// ---------------------------------------------------------------------------
// User (perfil)
// ---------------------------------------------------------------------------

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  neighborhood: z.string().trim().max(120).optional(),
  imageUrl: z.string().url().optional(),
  favorites: z.array(z.string()).optional(),
  preferences: z
    .object({
      notifications: z.boolean().optional(),
      publicUtilityAlerts: z.boolean().optional(),
      jobPostingAlerts: z.boolean().optional(),
    })
    .optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().optional(),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;

// ---------------------------------------------------------------------------
// Notice (Mural de Avisos)
// ---------------------------------------------------------------------------

export const createNoticeSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.enum(['general', 'alert', 'health']).optional(),
  startsAt: isoDate.optional(),
  expiresAt: isoDate.optional(),
  active: z.boolean().optional(),
});

export type CreateNoticeDto = z.infer<typeof createNoticeSchema>;
export type UpdateNoticeDto = Partial<CreateNoticeDto>;

// ---------------------------------------------------------------------------
// Public Utility (utilidade pública)
// ---------------------------------------------------------------------------

export const createPublicUtilitySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.enum(['emergency', 'health', 'civil', 'sanitation']).optional(),
  // `null` limpa o campo já salvo (o painel precisa remover um telefone ou
  // cidade antiga sem excluir e recriar o registro).
  phone: z.string().trim().min(1).nullish(),
  details: z.array(z.string().trim().min(1)).optional(),
  icon: z.string().trim().min(1).nullish(),
  city: z.string().trim().min(1).nullish(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export type CreatePublicUtilityDto = z.infer<typeof createPublicUtilitySchema>;
export type UpdatePublicUtilityDto = Partial<CreatePublicUtilityDto>;

// ---------------------------------------------------------------------------
// Autonomous Professional
// ---------------------------------------------------------------------------

export const createAutonomousProfessionalSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  specialty: z.string().min(1),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  photo: z.string().optional(),
  city: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().nonnegative().optional(),
  // `ownerClerkId` NÃO faz parte do contrato público: o dono é sempre o
  // clerk da sessão, injetado no service — nunca o valor enviado no payload
  // (mass assignment trocaria a titularidade do cadastro).
});

export type CreateAutonomousProfessionalDto = z.infer<typeof createAutonomousProfessionalSchema>;

export type UpdateAutonomousProfessionalDto = Partial<CreateAutonomousProfessionalDto>;

// ---------------------------------------------------------------------------
// City
// ---------------------------------------------------------------------------

export const createCitySchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  state: z.string().min(1),
});

export type CreateCityDto = z.infer<typeof createCitySchema>;

export type UpdateCityDto = Partial<CreateCityDto>;

// ---------------------------------------------------------------------------
// Tourist Spot (módulo de turismo)
// ---------------------------------------------------------------------------

const touristSpotCategorySchema = z.enum([
  'nature',
  'park',
  'waterfall',
  'viewpoint',
  'museum',
  'church',
  'monument',
  'square',
  'adventure',
  'other',
]);

const touristSpotBaseSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema,
  description: z.string().trim().min(1),
  category: touristSpotCategorySchema,
  photos: z.array(z.string()).optional(),
  // `null` limpa o campo já salvo (padrão createPublicUtilitySchema: o painel
  // precisa remover dados antigos sem excluir e recriar o registro).
  address: z.string().trim().min(1).nullish(),
  // `city` chega como slug e é resolvida para o id do documento City.
  city: z.string().trim().min(1).nullish(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingHours: z.array(z.string()).optional(),
  entryFee: z.enum(['free', 'paid', 'donation']).optional(),
  entryPrice: z.string().optional(),
  phone: z.string().trim().min(1).nullish(),
  whatsapp: z.string().trim().min(1).nullish(),
  website: urlSeguraSchema.optional(),
  instagram: z.string().optional(),
  featured: z.boolean().optional(),
  active: z.boolean(),
  order: z.number().int().optional(),
  // Empresa relacionada, por id ou slug (resolvida no service).
  relatedCompany: z.string().trim().min(1).nullish(),
});

export const createTouristSpotSchema = touristSpotBaseSchema.superRefine(
  (valor, ctx): void => {
    // Regra de negócio: o preço é texto livre e fica obrigatório quando a
    // entrada é cobrada.
    if (valor.entryFee === 'paid' && !valor.entryPrice?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'entryPrice é obrigatório quando entryFee é "paid"',
        path: ['entryPrice'],
      });
    }
  },
);

export type CreateTouristSpotDto = z.infer<typeof createTouristSpotSchema>;

export type UpdateTouristSpotDto = Partial<CreateTouristSpotDto>;

// Em atualização parcial, o preço só é validado quando vem no payload: um
// PUT que muda apenas `entryFee` preserva o entryPrice já salvo no registro.
export const updateTouristSpotSchema = touristSpotBaseSchema.partial().superRefine(
  (valor, ctx): void => {
    if (
      valor.entryFee === 'paid' &&
      valor.entryPrice !== undefined &&
      valor.entryPrice.trim().length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'entryPrice é obrigatório quando entryFee é "paid"',
        path: ['entryPrice'],
      });
    }
  },
);

// ---------------------------------------------------------------------------
// Tour Event (módulo de turismo)
// ---------------------------------------------------------------------------

const tourEventCategorySchema = z.enum([
  'festival',
  'show',
  'fair',
  'exhibition',
  'sport',
  'religious',
  'cultural',
  'workshop',
  'other',
]);

// Data pura no formato YYYY-MM-DD (o `isoDate` deste arquivo é datetime e não
// serve para startDate/endDate: a comparação de vigência é de string).
const dataDiaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar no formato YYYY-MM-DD')
  .refine((valor) => ehDataDeCalendario(valor), 'data inválida (ex.: 2026-11-05)');

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'horário deve estar no formato HH:mm');

/** Confere se o YYYY-MM-DD existe no calendário (rejeita 2026-02-30, 2026-13-01...). */
function ehDataDeCalendario(valor: string): boolean {
  const data = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

/**
 * Item da programação interna do evento (uma atração/atividade em um dia).
 *
 * As regras cruzadas LOCAIS do item (endTime >= startTime e preço do ingresso
 * pago) valem por si só — um PUT que troca a programação inteira valida o item
 * mesmo quando startDate/endDate não vêm no payload. Já a checagem da `date`
 * contra o intervalo do evento precisa das datas do evento e fica no
 * superRefine de cada schema (create/update), com guard.
 */
const tourEventScheduleItemSchema = z
  .object({
    date: dataDiaSchema,
    startTime: horaSchema.optional(),
    endTime: horaSchema.optional(),
    title: z.string().trim().min(1),
    description: z.string().trim().optional(),
    stage: z.string().trim().optional(),
    // Atrativo relacionado, por id ou slug (resolvido no service, como o
    // `organizerCompany` do evento).
    relatedSpot: z.string().trim().min(1).optional(),
    ticket: z.enum(['free', 'paid']).optional(),
    ticketPrice: z.string().optional(),
    ticketUrl: urlSeguraSchema.optional(),
  })
  .superRefine((item, ctx): void => {
    // Formato fixo HH:mm (24h): a ordem lexicográfica é a cronológica.
    if (item.startTime && item.endTime && item.endTime < item.startTime) {
      ctx.addIssue({
        code: 'custom',
        message: 'endTime do item deve ser maior ou igual a startTime',
        path: ['endTime'],
      });
    }
    if (item.ticket === 'paid' && !item.ticketPrice?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'ticketPrice do item é obrigatório quando ticket é "paid"',
        path: ['ticketPrice'],
      });
    }
  });

const tourEventScheduleItemArraySchema = z
  .array(tourEventScheduleItemSchema)
  // A programação é lista curta por evento (spec: sem paginação). Um array
  // sem teto aceitaria um payload de ~1MB (~10k itens) que travaria a tela
  // do app (ScrollView + .map) e o formulário do painel.
  .max(100, 'programação do evento não pode ter mais de 100 itens');

const tourEventBaseSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema,
  description: z.string().trim().min(1),
  category: tourEventCategorySchema,
  startDate: dataDiaSchema,
  endDate: dataDiaSchema,
  startTime: horaSchema.optional(),
  endTime: horaSchema.optional(),
  location: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).nullish(),
  // `null` limpa o campo já salvo (padrão do painel, como em touristSpot).
  // `city` chega como slug e é resolvida para o id do documento City.
  city: z.string().trim().min(1).nullish(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  organizer: z.string().trim().min(1).optional(),
  // Empresa organizadora, por id ou slug (resolvida no service).
  organizerCompany: z.string().trim().min(1).nullish(),
  ticket: z.enum(['free', 'paid']).optional(),
  ticketPrice: z.string().optional(),
  ticketUrl: urlSeguraSchema.optional(),
  photos: z.array(z.string()).optional(),
  phone: z.string().trim().min(1).nullish(),
  whatsapp: z.string().trim().min(1).nullish(),
  website: urlSeguraSchema.optional(),
  instagram: z.string().optional(),
  featured: z.boolean().optional(),
  active: z.boolean(),
  // Programação interna do evento: itens embutidos, sem coleção própria.
  schedule: tourEventScheduleItemArraySchema.optional(),
});

export const createTourEventSchema = tourEventBaseSchema.superRefine(
  (valor, ctx): void => {
    // Formato fixo YYYY-MM-DD: a ordem lexicográfica é a ordem cronológica.
    // Nunca misture data pura com datetime ISO nesta comparação.
    if (valor.endDate < valor.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'endDate deve ser maior ou igual a startDate',
        path: ['endDate'],
      });
    }
    if (valor.ticket === 'paid' && !valor.ticketPrice?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'ticketPrice é obrigatório quando ticket é "paid"',
        path: ['ticketPrice'],
      });
    }
    // Guard: o superRefine só roda com os campos base válidos, então
    // startDate/endDate já são datas de calendário YYYY-MM-DD. Se o intervalo
    // do evento estiver invertido, a issue acima já sinaliza o erro real —
    // sem mascará-lo com a falha da checagem dos itens.
    if (valor.endDate >= valor.startDate) {
      valor.schedule?.forEach((item, indice) => {
        if (item.date < valor.startDate || item.date > valor.endDate) {
          ctx.addIssue({
            code: 'custom',
            message: `schedule[${indice}]: date do item deve estar entre startDate e endDate do evento`,
            path: ['schedule', indice, 'date'],
          });
        }
      });
    }
  },
);

export type CreateTourEventDto = z.infer<typeof createTourEventSchema>;

export type UpdateTourEventDto = Partial<CreateTourEventDto>;

// ---------------------------------------------------------------------------
// Push token (registro do dispositivo)
// ---------------------------------------------------------------------------

/**
 * Token de push do dispositivo (Expo).
 *
 * `clerkId` NÃO faz parte do contrato: a identidade vem da sessão (injetada no
 * service) — o anti-sequestro depende de nunca aceitar o dono pelo body.
 */
export const pushTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, 'token é obrigatório')
    .max(500, 'token excede o tamanho máximo')
    // eslint-disable-next-line no-control-regex -- rejeitar controles É o objetivo aqui (mesmo padrão de utils/query.ts)
    .refine((valor) => !/[\s\u0000-\u001f\u007f]/.test(valor), 'token contém caracteres inválidos'),
});

export type PushTokenDto = z.infer<typeof pushTokenSchema>;

// ---------------------------------------------------------------------------
// Notification (broadcast)
// ---------------------------------------------------------------------------

/** Payload de notificação em massa: limites impedem a sobrecarga do Expo. */
export const broadcastSchema = z.object({
  title: z.string().trim().min(1, 'title é obrigatório').max(120, 'title excede o tamanho máximo'),
  body: z.string().trim().max(500, 'body excede o tamanho máximo').optional(),
});

export type BroadcastDto = z.infer<typeof broadcastSchema>;

// Em atualização parcial, os campos ausentes presumem os valores já salvos: as
// regras cruzadas (endDate x startDate, ticket paid x ticketPrice) são
// revalidadas sobre o estado RESULTANTE no service.
export const updateTourEventSchema = tourEventBaseSchema.partial().superRefine(
  (valor, ctx): void => {
    if (valor.startDate && valor.endDate && valor.endDate < valor.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'endDate deve ser maior ou igual a startDate',
        path: ['endDate'],
      });
    }
    if (
      valor.ticket === 'paid' &&
      valor.ticketPrice !== undefined &&
      valor.ticketPrice.trim().length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'ticketPrice é obrigatório quando ticket é "paid"',
        path: ['ticketPrice'],
      });
    }
    // Guard: PUT parcial pode vir sem startDate/endDate (presumem os valores
    // já salvos). Só checa a vigência dos itens quando o intervalo completo
    // vem no payload; quando não vem, o item tem as regras locais validadas e
    // a vigência sobre o estado resultante é papel do service (padrão endDate
    // x startDate e ticket x ticketPrice deste arquivo).
    if (valor.schedule && valor.startDate && valor.endDate) {
      // Desestruturação local: o narrowing de `valor` não atravessa o
      // callback do forEach na análise do TS.
      const { startDate, endDate } = valor;
      valor.schedule.forEach((item, indice) => {
        if (item.date < startDate || item.date > endDate) {
          ctx.addIssue({
            code: 'custom',
            message: `schedule[${indice}]: date do item deve estar entre startDate e endDate do evento`,
            path: ['schedule', indice, 'date'],
          });
        }
      });
    }
  },
);
