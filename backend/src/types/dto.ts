import { z } from 'zod';

import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug deve estar em kebab-case (ex.: restaurantes)');

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

export const createCompanySchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  description: z.string().min(1),
  category: z.string().min(1),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  logo: z.string().optional(),
  cover: z.string().optional(),
  isFeatured: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  openingHours: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
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
  company: z.string().min(1),
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
  company: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
});

export type CreateJobDto = z.infer<typeof createJobSchema>;

export type UpdateJobDto = Partial<CreateJobDto>;
