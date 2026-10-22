/**
 * Tipos de domínio compartilhados (ONDA 1).
 *
 * Este arquivo contém APENAS tipos TypeScript — sem runtime e sem imports.
 *
 * Convenção bidirecional: os campos de ID e datas são tipados como `string`
 * porque JSON não tem ObjectId nem Date. Serializers em cada app convertem:
 *  - `_id`, `category`, `company` (quando referência) → string (ObjectId hex)
 *  - `createdAt`, `updatedAt`, `expiresAt` → string (ISO 8601)
 * Campos de referência usam união `string | Entidade` (populate do Mongoose).
 */

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Produto ou serviço comercializado pela empresa. */
export interface CompanyProduct {
  name: string;
  description?: string;
  price?: number;
  image?: string;
}

export interface Company {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string | Category;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  logo?: string;
  cover?: string;
  isFeatured?: boolean;
  rating?: number;
  ratingCount?: number;
  isVerified?: boolean;
  website?: string;
  instagram?: string;
  facebook?: string;
  openingHours?: string[];
  services?: string[];
  products?: CompanyProduct[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image?: string;
  link?: string;
  order?: number;
  active?: boolean;
  createdAt?: string;
}

export interface Coupon {
  _id: string;
  title: string;
  company: string | Company;
  code: string;
  discount?: string;
  description?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface Job {
  _id: string;
  title: string;
  company: string | Company;
  description?: string;
  location?: string;
  type?: string;
  createdAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
  createdAt?: string;
}

/** Resultado paginado padrão das listagens da API. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
