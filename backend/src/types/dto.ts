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
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  openingHours: z.array(z.string()).optional(),
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

export type UpdateCouponDto = Partial<CreateCouponDto>;

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

export type UpdateJobDto = Partial<CreateJobDto>;

// ---------------------------------------------------------------------------
// User (perfil)
// ---------------------------------------------------------------------------

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  imageUrl: z.string().url().optional(),
  favorites: z.array(z.string()).optional(),
  preferences: z
    .object({
      notifications: z.boolean().optional(),
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
  ownerClerkId: z.string().optional(),
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
